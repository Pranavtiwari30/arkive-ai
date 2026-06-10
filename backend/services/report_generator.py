"""
ReportGenerator — produces professional PDF compliance dossiers from assessment results.

The PDF report is the core product artifact: a timestamped, citable compliance dossier
a DPO can hand to a regulator, auditor, or board.

Implementation:
- Jinja2 HTML template → WeasyPrint → PDF
- Falls back to ReportLab if WeasyPrint/GTK not available
- Stored in MongoDB GridFS or local filesystem per REPORT_STORAGE env var
- Report ID (UUID) on every report for regulator correspondence reference
- Legal disclaimer on cover + every page footer
- "Powered by Arkive AI" watermark on Starter tier
"""

import io
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from services.logger import get_logger

log = get_logger(__name__)

APP_VERSION = "2.0.0"
TEMPLATE_DIR = Path(__file__).parent.parent / "templates" / "report"
REPORT_STORAGE = os.getenv("REPORT_STORAGE", "local")
REPORTS_DIR = Path("reports")
REPORTS_DIR.mkdir(exist_ok=True)

LEGAL_DISCLAIMER = ""


def generate_compliance_report(
    assessment_data: dict,
    organization_name: str,
    ai_system_name: str,
    user_id: str,
    org_id: str | None = None,
    subscription_tier: str = "starter",
) -> dict:
    """
    Generate a PDF compliance dossier from assessment results.

    Args:
        assessment_data:    Combined dict from compliance check, risk tier, role classifier
                            and optionally red team + multi-framework results
        organization_name:  Organisation display name (appears on cover page)
        ai_system_name:     Name of the AI system being assessed
        user_id:            Requesting user
        org_id:             Organisation ID for storage scoping
        subscription_tier:  "starter" | "pro" | "team" — controls watermark

    Returns:
        {
            "report_id": str (UUID),
            "storage_path": str,
            "generated_at": str (ISO),
            "pages": int (estimated),
        }
    """
    report_id = str(uuid.uuid4())
    generated_at = datetime.now(timezone.utc)

    log.info("report_generation_start", extra={
        "report_id": report_id,
        "org_id": org_id,
        "system": ai_system_name,
    })

    # Try WeasyPrint first, fall back to ReportLab
    try:
        pdf_bytes = _generate_with_weasyprint(
            report_id=report_id,
            generated_at=generated_at,
            assessment_data=assessment_data,
            organization_name=organization_name,
            ai_system_name=ai_system_name,
            subscription_tier=subscription_tier,
        )
        log.info("report_generated_weasyprint", extra={"report_id": report_id})
    except Exception as e:
        log.warning("weasyprint_failed_trying_reportlab", extra={"error": str(e)})
        try:
            pdf_bytes = _generate_with_reportlab(
                report_id=report_id,
                generated_at=generated_at,
                assessment_data=assessment_data,
                organization_name=organization_name,
                ai_system_name=ai_system_name,
                subscription_tier=subscription_tier,
            )
            log.info("report_generated_reportlab", extra={"report_id": report_id})
        except Exception as e2:
            log.error("report_generation_failed", extra={"error": str(e2)})
            raise RuntimeError(f"PDF generation failed: {e2}") from e2

    # Store the PDF
    storage_path = _store_pdf(pdf_bytes, report_id, org_id)

    log.info("report_stored", extra={
        "report_id": report_id,
        "storage": REPORT_STORAGE,
        "path": storage_path,
        "size_bytes": len(pdf_bytes),
    })

    return {
        "report_id": report_id,
        "storage_path": storage_path,
        "generated_at": generated_at.isoformat(),
        "size_bytes": len(pdf_bytes),
    }


def _generate_with_weasyprint(
    report_id: str,
    generated_at: datetime,
    assessment_data: dict,
    organization_name: str,
    ai_system_name: str,
    subscription_tier: str,
) -> bytes:
    """Generate PDF using WeasyPrint + Jinja2 HTML template."""
    from jinja2 import Environment, FileSystemLoader, select_autoescape
    from weasyprint import HTML, CSS  # type: ignore

    env = Environment(
        loader=FileSystemLoader(str(TEMPLATE_DIR)),
        autoescape=select_autoescape(["html"]),
    )
    template = env.get_template("report.html.j2")

    html_content = template.render(
        **_build_template_context(
            report_id=report_id,
            generated_at=generated_at,
            assessment_data=assessment_data,
            organization_name=organization_name,
            ai_system_name=ai_system_name,
            subscription_tier=subscription_tier,
        )
    )

    pdf = HTML(string=html_content, base_url=str(TEMPLATE_DIR)).write_pdf()
    return pdf


def _generate_with_reportlab(
    report_id: str,
    generated_at: datetime,
    assessment_data: dict,
    organization_name: str,
    ai_system_name: str,
    subscription_tier: str,
) -> bytes:
    """Generate PDF using ReportLab (pure Python, no GTK required)."""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import mm
    from reportlab.lib import colors
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
        HRFlowable, PageBreak,
    )

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=20*mm,
        rightMargin=20*mm,
        topMargin=25*mm,
        bottomMargin=25*mm,
    )

    styles = getSampleStyleSheet()

    # Custom style definitions
    DARK_BLUE = colors.HexColor("#0f172a")
    ACCENT = colors.HexColor("#3b82f6")
    PASS_GREEN = colors.HexColor("#22c55e")
    GAP_RED = colors.HexColor("#ef4444")
    AMBER = colors.HexColor("#f59e0b")
    LIGHT_BG = colors.HexColor("#f8fafc")

    h1_style = ParagraphStyle("H1", parent=styles["Heading1"],
                               textColor=DARK_BLUE, fontSize=24, spaceAfter=6)
    h2_style = ParagraphStyle("H2", parent=styles["Heading2"],
                               textColor=DARK_BLUE, fontSize=16, spaceAfter=4)
    h3_style = ParagraphStyle("H3", parent=styles["Heading3"],
                               textColor=ACCENT, fontSize=13, spaceAfter=3)
    body_style = ParagraphStyle("Body", parent=styles["Normal"],
                                fontSize=10, leading=14, spaceAfter=6)
    small_style = ParagraphStyle("Small", parent=styles["Normal"],
                                 fontSize=8, textColor=colors.grey)

    ctx = _build_template_context(
        report_id=report_id,
        generated_at=generated_at,
        assessment_data=assessment_data,
        organization_name=organization_name,
        ai_system_name=ai_system_name,
        subscription_tier=subscription_tier,
    )

    story = []

    # ── Cover Page ────────────────────────────────────────────────────────────
    story.append(Spacer(1, 30*mm))
    story.append(Paragraph("EU AI Act Compliance Assessment Report", h1_style))
    story.append(Spacer(1, 5*mm))
    story.append(Paragraph(f"<b>{ctx['ai_system_name']}</b>", h2_style))
    story.append(Paragraph(f"Organisation: {ctx['organization_name']}", body_style))
    story.append(Paragraph(f"Assessment Date: {ctx['assessment_date']}", body_style))
    story.append(Paragraph(f"Report ID: {ctx['report_id']}", small_style))
    story.append(Paragraph(f"Generated by Arkive AI v{APP_VERSION}", small_style))
    story.append(Spacer(1, 10*mm))
    story.append(HRFlowable(width="100%", thickness=1, color=ACCENT))
    story.append(Spacer(1, 5*mm))
    story.append(Spacer(1, 5*mm))

    if subscription_tier == "starter":
        story.append(Spacer(1, 5*mm))
        story.append(Paragraph(
            "<i>Generated with Arkive AI — Upgrade to Pro for white-label reports</i>",
            small_style
        ))

    story.append(PageBreak())

    # ── Section 1: Executive Summary ─────────────────────────────────────────
    story.append(Paragraph("Section 1: Executive Summary", h2_style))
    story.append(HRFlowable(width="100%", thickness=0.5, color=ACCENT))
    story.append(Spacer(1, 3*mm))

    overall_status = ctx.get("overall_status", "Unknown")
    risk_tier = ctx.get("risk_tier", "Unknown")
    org_role = ctx.get("org_role", "Unknown")

    status_color = {"COMPLIANT": PASS_GREEN, "PARTIAL": AMBER, "NON_COMPLIANT": GAP_RED}.get(
        overall_status, colors.grey
    )

    story.append(Paragraph(
        f"<b>Overall Compliance Posture:</b> "
        f'<font color="{status_color.hexval() if hasattr(status_color, "hexval") else "#888"}">'
        f"{overall_status}</font>",
        body_style,
    ))
    story.append(Paragraph(f"<b>Risk Tier:</b> {risk_tier}", body_style))
    story.append(Paragraph(f"<b>Organisational Role:</b> {org_role}", body_style))
    story.append(Spacer(1, 3*mm))

    # Pillar scorecard table
    pillars = ctx.get("pillars", [])
    if pillars:
        story.append(Paragraph("<b>8-Pillar Compliance Scorecard</b>", h3_style))
        pillar_data = [["Pillar", "Status", "Confidence"]]
        for p in pillars:
            status = p.get("status", "GAP")
            pillar_data.append([
                p.get("pillar_name", ""),
                status,
                f"{round(p.get('confidence', 0) * 100)}%",
            ])

        pillar_table = Table(pillar_data, colWidths=[90*mm, 35*mm, 35*mm])
        pillar_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), DARK_BLUE),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT_BG]),
            ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#e2e8f0")),
            ("ALIGN", (1, 0), (-1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ]))
        story.append(pillar_table)

    story.append(PageBreak())

    # ── Section 2: Risk Classification ───────────────────────────────────────
    story.append(Paragraph("Section 2: Risk Classification", h2_style))
    story.append(HRFlowable(width="100%", thickness=0.5, color=ACCENT))
    story.append(Spacer(1, 3*mm))

    risk_data = ctx.get("risk_classification", {})
    if risk_data:
        story.append(Paragraph(f"<b>Risk Tier:</b> {risk_data.get('risk_tier', 'Unknown')}", body_style))
        story.append(Paragraph(f"<b>Legal Basis:</b> {risk_data.get('legal_basis', 'N/A')}", body_style))
        story.append(Paragraph(f"<b>Classification Step:</b> Step {risk_data.get('classification_procedure_step', '?')}", body_style))
        story.append(Spacer(1, 2*mm))
        story.append(Paragraph("<b>Reasoning:</b>", h3_style))
        story.append(Paragraph(risk_data.get("reasoning", ""), body_style))

        obligations = risk_data.get("obligations", [])
        if obligations:
            story.append(Paragraph("<b>Key Obligations Triggered:</b>", h3_style))
            for ob in obligations:
                story.append(Paragraph(
                    f"• <b>{ob.get('article', '')}</b>: {ob.get('obligation', '')}",
                    body_style,
                ))

    story.append(PageBreak())

    # ── Section 3: 8-Pillar Compliance Analysis ───────────────────────────────
    story.append(Paragraph("Section 3: 8-Pillar Compliance Analysis", h2_style))
    story.append(HRFlowable(width="100%", thickness=0.5, color=ACCENT))

    for pillar in ctx.get("pillars", []):
        story.append(Spacer(1, 5*mm))
        status = pillar.get("status", "GAP")
        badge_color = PASS_GREEN if status == "PASS" else (AMBER if status == "PARTIAL" else GAP_RED)
        story.append(Paragraph(
            f"<b>{pillar.get('pillar_name', '')}</b> — "
            f'<font color="{badge_color.hexval() if hasattr(badge_color, "hexval") else "#888"}">'
            f"<b>{status}</b></font>",
            h3_style,
        ))
        story.append(Paragraph(f"<b>Finding:</b> {pillar.get('finding', '')}", body_style))
        if pillar.get("gap_description"):
            story.append(Paragraph(f"<b>Gap:</b> {pillar['gap_description']}", body_style))
        if pillar.get("recommendation"):
            story.append(Paragraph(f"<b>Remediation:</b> {pillar['recommendation']}", body_style))
        refs = pillar.get("standards_referenced", [])
        if refs:
            story.append(Paragraph(f"<b>Standards:</b> {', '.join(refs)}", small_style))

    story.append(PageBreak())

    # ── Section 4: Red Team Assessment ───────────────────────────────────────
    red_team = ctx.get("red_team_results")
    if red_team:
        story.append(Paragraph("Section 4: Red Team Assessment", h2_style))
        story.append(HRFlowable(width="100%", thickness=0.5, color=ACCENT))
        story.append(Paragraph(
            "The following adversarial vectors were tested against this AI system's policy documentation.",
            body_style,
        ))
        attacks = red_team.get("attacks", [])
        for i, attack in enumerate(attacks, 1):
            story.append(Spacer(1, 3*mm))
            story.append(Paragraph(f"<b>Vector {i}: {attack.get('technique', '')}</b>", h3_style))
            story.append(Paragraph(f"<b>Prompt:</b> {attack.get('prompt', '')}", body_style))
            story.append(Paragraph(
                f"<b>Expected Vulnerability:</b> {attack.get('expected_vulnerability', '')}", body_style
            ))
        story.append(PageBreak())

    # ── Section 5: Audit Trail ────────────────────────────────────────────────
    story.append(Paragraph("Section 5: Audit Trail", h2_style))
    story.append(HRFlowable(width="100%", thickness=0.5, color=ACCENT))
    story.append(Spacer(1, 3*mm))

    audit_data = [
        ["Field", "Value"],
        ["Report ID", ctx["report_id"]],
        ["Document", ctx.get("document_name", "N/A")],
        ["SHA-256", ctx.get("document_hash", "N/A")[:32] + "..."],
        ["Assessment Date", ctx["assessment_date"]],
        ["Retrieval Model", "all-MiniLM-L6-v2"],
        ["Synthesis Model", "Llama 3.3 70B (Groq)"],
        ["Classification Model", "Llama 3.1 8B (Groq)"],
        ["Platform Version", f"Arkive AI v{APP_VERSION}"],
    ]

    audit_table = Table(audit_data, colWidths=[60*mm, 110*mm])
    audit_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), DARK_BLUE),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT_BG]),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#e2e8f0")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(audit_table)

    story.append(Spacer(1, 5*mm))
    story.append(Spacer(1, 5*mm))

    doc.build(story)
    return buffer.getvalue()


def _build_template_context(
    report_id: str,
    generated_at: datetime,
    assessment_data: dict,
    organization_name: str,
    ai_system_name: str,
    subscription_tier: str,
) -> dict:
    """Build the unified context dict used by both WeasyPrint and ReportLab paths."""
    pillars = assessment_data.get("pillars", [])
    compliance_score = assessment_data.get("compliance_score", 0)
    overall_status = assessment_data.get("overall_status", "NON_COMPLIANT")

    pass_count = sum(1 for p in pillars if p.get("status") == "PASS")
    gap_count = sum(1 for p in pillars if p.get("status") == "GAP")

    return {
        "report_id": report_id,
        "generated_at": generated_at.isoformat(),
        "assessment_date": generated_at.strftime("%d %B %Y, %H:%M UTC"),
        "organization_name": organization_name,
        "ai_system_name": ai_system_name,
        "subscription_tier": subscription_tier,
        "show_watermark": subscription_tier == "starter",
        "app_version": APP_VERSION,
        "legal_disclaimer": LEGAL_DISCLAIMER,
        # Assessment data
        "overall_status": overall_status,
        "compliance_score": compliance_score,
        "pillars": pillars,
        "pass_count": pass_count,
        "gap_count": gap_count,
        "partial_count": len(pillars) - pass_count - gap_count,
        # Risk classification
        "risk_tier": assessment_data.get("risk_tier", "Unknown"),
        "risk_classification": {
            "risk_tier": assessment_data.get("risk_tier"),
            "legal_basis": assessment_data.get("legal_basis"),
            "classification_procedure_step": assessment_data.get("classification_procedure_step"),
            "reasoning": assessment_data.get("reasoning"),
            "obligations": assessment_data.get("obligations", []),
        },
        # Role classification
        "org_role": assessment_data.get("role", "Unknown"),
        # Document metadata
        "document_name": assessment_data.get("document_name", "N/A"),
        "document_hash": assessment_data.get("document_hash", "N/A"),
        # Red team (optional)
        "red_team_results": assessment_data.get("red_team_results"),
        # Multi-framework (optional)
        "framework_results": assessment_data.get("framework_results"),
    }


def _store_pdf(pdf_bytes: bytes, report_id: str, org_id: str | None) -> str:
    """Store the PDF bytes and return the storage path/identifier."""
    if REPORT_STORAGE == "gridfs":
        return _store_gridfs(pdf_bytes, report_id, org_id)
    return _store_local(pdf_bytes, report_id, org_id)


def _store_local(pdf_bytes: bytes, report_id: str, org_id: str | None) -> str:
    """Store PDF to local filesystem (dev/staging)."""
    org_dir = REPORTS_DIR / (org_id or "shared")
    org_dir.mkdir(parents=True, exist_ok=True)
    path = org_dir / f"{report_id}.pdf"
    path.write_bytes(pdf_bytes)
    return str(path)


def _store_gridfs(pdf_bytes: bytes, report_id: str, org_id: str | None) -> str:
    """Store PDF in MongoDB GridFS (production)."""
    import gridfs
    from db.mongo import client as mongo_client, MONGO_DB_NAME
    db = mongo_client[MONGO_DB_NAME]
    fs = gridfs.GridFS(db)
    file_id = fs.put(
        pdf_bytes,
        filename=f"{report_id}.pdf",
        report_id=report_id,
        org_id=org_id,
        content_type="application/pdf",
    )
    return f"gridfs:{file_id}"


def get_report_bytes(storage_path: str) -> bytes:
    """Retrieve PDF bytes from storage (local or GridFS)."""
    if storage_path.startswith("gridfs:"):
        import gridfs
        from bson import ObjectId
        from db.mongo import client as mongo_client, MONGO_DB_NAME
        db = mongo_client[MONGO_DB_NAME]
        fs = gridfs.GridFS(db)
        file_id = ObjectId(storage_path.replace("gridfs:", ""))
        return fs.get(file_id).read()
    # Local filesystem
    return Path(storage_path).read_bytes()
