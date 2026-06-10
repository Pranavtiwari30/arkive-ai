"""
Reports routes for Arkive AI.

POST /api/reports/generate   — async report generation, returns task_id
GET  /api/reports/           — list org's reports (paginated)
GET  /api/reports/{id}/download — streams PDF, authenticated, org-scoped
DELETE /api/reports/{id}    — delete a report (admin/compliance_officer)
"""

import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from bson import ObjectId

from db.mongo import reports_col, compliance_results_col
from middleware.auth import get_current_user
from services.audit import log_event
from services.logger import get_logger
from services.rbac import require_compliance_officer, require_any_role
from services.report_generator import generate_compliance_report, get_report_bytes
from services.task_queue import TaskQueue, get_task_status, update_stage

log = get_logger(__name__)
router = APIRouter()


class ReportGenerateRequest(BaseModel):
    assessment_id: str | None = None
    ai_system_name: str = "AI System"
    organization_name: str = "Organisation"
    # Optional: include red team / framework results
    include_red_team: bool = False
    include_frameworks: bool = False


def _build_report_background(
    *,
    task_id: str,
    assessment_data: dict,
    organization_name: str,
    ai_system_name: str,
    user_id: str,
    org_id: str | None,
    subscription_tier: str,
) -> None:
    """Background task: generate PDF and save report metadata."""
    try:
        update_stage(task_id, "extracting_text", extra={"stage_label": "Generating report..."})
        result = generate_compliance_report(
            assessment_data=assessment_data,
            organization_name=organization_name,
            ai_system_name=ai_system_name,
            user_id=user_id,
            org_id=org_id,
            subscription_tier=subscription_tier,
        )

        # Save report metadata to MongoDB
        report_doc = {
            "report_id": result["report_id"],
            "org_id": org_id,
            "created_by": user_id,
            "ai_system_name": ai_system_name,
            "storage_path": result["storage_path"],
            "size_bytes": result["size_bytes"],
            "created_at": datetime.now(timezone.utc),
            "subscription_tier": subscription_tier,
            "assessment_data_summary": {
                "overall_status": assessment_data.get("overall_status"),
                "compliance_score": assessment_data.get("compliance_score"),
                "risk_tier": assessment_data.get("risk_tier"),
            },
        }
        reports_col.insert_one(report_doc)

        log_event("report_generated", user_id, {
            "report_id": result["report_id"],
            "ai_system_name": ai_system_name,
            "size_bytes": result["size_bytes"],
        }, org_id=org_id)

        update_stage(task_id, "complete", extra={
            "report_id": result["report_id"],
            "download_url": f"/api/reports/{result['report_id']}/download",
        })
        log.info("report_task_complete", extra={"task_id": task_id, "report_id": result["report_id"]})

    except Exception as e:
        log.error("report_task_failed", extra={"task_id": task_id, "error": str(e)})
        raise


@router.post("/generate")
async def generate_report(
    request: ReportGenerateRequest,
    background_tasks: BackgroundTasks,
    user: dict = Depends(require_compliance_officer),
):
    """
    Trigger async PDF report generation.
    Returns {task_id} immediately — poll /tasks/{task_id}/status for progress.
    """
    user_id = user["user_id"]
    org_id = user.get("org_id")

    # Fetch assessment data if assessment_id provided
    assessment_data: dict = {}
    if request.assessment_id:
        try:
            result = compliance_results_col.find_one(
                {"_id": ObjectId(request.assessment_id), "org_id": org_id},
                {"_id": 0},
            )
            if result:
                assessment_data = result
        except Exception:
            pass

    if not assessment_data:
        raise HTTPException(
            status_code=400,
            detail="No assessment data found. Run a compliance check first, or provide a valid assessment_id.",
        )

    # Determine subscription tier (default to starter until billing is integrated)
    subscription_tier = user.get("subscription_tier", "starter")

    tq = TaskQueue()
    task_id = tq.enqueue(
        background_tasks,
        _build_report_background,
        assessment_data=assessment_data,
        organization_name=request.organization_name,
        ai_system_name=request.ai_system_name,
        user_id=user_id,
        org_id=org_id,
        subscription_tier=subscription_tier,
    )

    log.info("report_generation_queued", extra={"task_id": task_id, "user_id": user_id})
    return {
        "task_id": task_id,
        "status": "queued",
        "message": "Report generation started. Poll /api/documents/tasks/{task_id}/status for progress.",
    }


@router.get("/tasks/{task_id}/status")
async def report_task_status(task_id: str, user: dict = Depends(require_any_role)):
    status = get_task_status(task_id)
    if not status:
        raise HTTPException(status_code=404, detail="Task not found or expired.")
    return status


@router.get("/")
async def list_reports(
    limit: int = 20,
    skip: int = 0,
    user: dict = Depends(require_any_role),
):
    """List reports for the current organisation (paginated)."""
    org_id = user.get("org_id")
    query = {"org_id": org_id} if org_id else {"created_by": user["user_id"]}

    reports = list(
        reports_col.find(query, {"storage_path": 0})
        .sort("created_at", -1)
        .skip(skip)
        .limit(limit)
    )
    for r in reports:
        r["_id"] = str(r["_id"])

    total = reports_col.count_documents(query)
    return {"reports": reports, "total": total, "skip": skip, "limit": limit}


@router.get("/{report_id}/download")
async def download_report(report_id: str, user: dict = Depends(require_any_role)):
    """
    Download a generated PDF report. Requires authentication + org ownership.
    Streams the PDF bytes directly.
    """
    org_id = user.get("org_id")
    query: dict = {"report_id": report_id}
    if org_id:
        query["org_id"] = org_id

    report = reports_col.find_one(query)
    if not report:
        raise HTTPException(
            status_code=404,
            detail="Report not found or you do not have access to it.",
        )

    try:
        pdf_bytes = get_report_bytes(report["storage_path"])
    except Exception as e:
        log.error("report_download_failed", extra={"report_id": report_id, "error": str(e)})
        raise HTTPException(status_code=500, detail="Failed to retrieve report file.")

    log_event("report_downloaded", user["user_id"], {
        "report_id": report_id,
        "ai_system_name": report.get("ai_system_name"),
    }, org_id=org_id)

    filename = f"arkive-compliance-report-{report_id[:8]}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.delete("/{report_id}")
async def delete_report(report_id: str, user: dict = Depends(require_compliance_officer)):
    """Delete a report (compliance officer or admin only)."""
    org_id = user.get("org_id")
    query: dict = {"report_id": report_id}
    if org_id:
        query["org_id"] = org_id

    result = reports_col.delete_one(query)
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Report not found.")

    log_event("report_deleted", user["user_id"], {"report_id": report_id}, org_id=org_id)
    return {"message": "Report deleted successfully."}
