/**
 * Disclaimer acknowledgment modal — shown once per user before first assessment.
 * Non-dismissible: user must click "I Understand" to proceed.
 */
import { useState } from "react"

const DISCLAIMER_TEXT = `Arkive AI provides informational analysis to assist in EU AI Act compliance preparation. It does not constitute legal advice, a formal conformity assessment, or regulatory certification.

This platform generates analytical reports based on AI-powered review of policy documents. Findings, risk tier classifications, and remediation recommendations are starting points for your compliance work — not final determinations.

You should consult qualified legal counsel and authorised conformity assessment bodies for all regulatory compliance decisions. Arkive AI assumes no liability for actions taken based on outputs from this platform.`

export default function DisclaimerModal({ onAccept }) {
  const [checked, setChecked] = useState(false)

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9000,
        background: "rgba(8, 12, 20, 0.85)",
        backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "24px",
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="disclaimer-title"
    >
      <div
        style={{
          background: "var(--color-bg-card)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-xl)",
          padding: "40px",
          maxWidth: "540px",
          width: "100%",
          boxShadow: "var(--shadow-lg)",
          animation: "fadeIn 0.25s ease",
        }}
      >
        {/* Icon */}
        <div style={{
          width: 48, height: 48,
          background: "rgba(245,158,11,0.1)",
          border: "1px solid rgba(245,158,11,0.25)",
          borderRadius: "12px",
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: "20px",
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>

        <h2 id="disclaimer-title" style={{
          fontSize: "1.2rem", fontWeight: 700,
          color: "var(--color-text-primary)",
          marginBottom: "8px",
        }}>
          Before You Begin
        </h2>
        <p style={{ color: "var(--color-text-secondary)", fontSize: "0.85rem", marginBottom: "20px" }}>
          Please read this important notice about how Arkive AI works.
        </p>

        <div style={{
          background: "var(--color-bg-secondary)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-md)",
          padding: "16px",
          fontSize: "0.82rem",
          color: "var(--color-text-secondary)",
          lineHeight: "1.6",
          marginBottom: "24px",
          whiteSpace: "pre-line",
        }}>
          {DISCLAIMER_TEXT}
        </div>

        <label style={{
          display: "flex", alignItems: "flex-start", gap: "12px",
          cursor: "pointer", marginBottom: "24px",
        }}>
          <input
            type="checkbox"
            id="disclaimer-checkbox"
            checked={checked}
            onChange={e => setChecked(e.target.checked)}
            style={{ marginTop: "2px", accentColor: "var(--color-accent)", width: 16, height: 16, flexShrink: 0 }}
          />
          <span style={{ fontSize: "0.85rem", color: "var(--color-text-primary)", lineHeight: 1.5 }}>
            I understand that Arkive AI provides informational analysis only and does not constitute legal advice.
            I will consult qualified legal counsel for compliance determinations.
          </span>
        </label>

        <button
          id="disclaimer-accept-btn"
          onClick={onAccept}
          disabled={!checked}
          className="btn btn-primary"
          style={{ width: "100%", justifyContent: "center", padding: "12px" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          I Understand — Continue to Arkive AI
        </button>
      </div>
    </div>
  )
}
