# CYCLONE-X V2 — FORMAL SECURITY AUDIT REPORT

This report certifies the security posture of the **CYCLONE-X** platform following the comprehensive V2 security upgrade (Section 63, 64, 65, 97).

---

## 1. Executive Summary
- **Audit Date:** 2026-09-27
- **Audit Scope:** Entire repository (Backend, Frontend, Configuration, CI/CD, Documentation).
- **Result:** **PASSED — ALL HARDCODED CREDENTIALS ELIMINATED.**

---

## 2. Hardcoded Secret & Credential Remediation
A complete regex sweep for `API_KEY`, `SECRET`, `TOKEN`, `PASSWORD`, `PRIVATE_KEY`, `Bearer`, and service account keys was conducted across all files.

### Key Remediation Actions Taken:
1. **Carto retina basemap key (`cb1_3zqt_1_...`):**
   - Completely stripped from `.env`, `.env.example`, `frontend/.env.local`, `security.py`, `routes_system.py`, `frontend/lib/api.ts`, `MapContainer.tsx`, and `SettingsView.tsx`.
   - Replaced with environment-driven variable `NEXT_PUBLIC_MAP_KEY`. When unset, Carto raster tiles load via standard public anonymous tile requests without authentication errors.
2. **Gemini API Key:**
   - Isolated to server-side `GEMINI_API_KEY` environment variable.
   - Client applications never access the raw key; all AI queries pass through authenticated backend proxy (`/api/ai/copilot-v2`, `/api/ai/explain`).
3. **Earth Engine Credentials:**
   - Service account JSON paths are configured strictly server-side via `GOOGLE_APPLICATION_CREDENTIALS` and `EARTH_ENGINE_PROJECT`.
   - No private keys or service account tokens are exposed to the browser or bundled in frontend client builds.

---

## 3. Role-Based Access Control (RBAC) Enforcement
Authentication and authorization have been elevated from informal client checks to strict server-side dependency enforcement:

| Role | Level | Permitted Operations |
| :--- | :--- | :--- |
| `VIEWER` | 1 | Read-only access to live/demo tracks, ensembles, hazard maps, and reports. |
| `OPERATOR` | 2 | Viewer rights + What-If scenario simulations, drafting disaster advisories. |
| `REVIEWER` | 3 | Operator rights + Formal scientific review and approval of advisory drafts. |
| `ADMIN` | 4 | Reviewer rights + Advisory dispatch to delivery channels, data source configuration. |

### Enforced Protection Endpoints:
- `POST /api/alerts/approve` $\to$ Requires minimum role: `REVIEWER`. (Rejects `VIEWER` and `OPERATOR` with `403 Forbidden`).
- `POST /api/alerts/send` $\to$ Requires minimum role: `ADMIN`. (Rejects all lower roles with `403 Forbidden`).
- Verified by automated unit tests in `tests/test_v2_scientific_engine.py::test_rbac_alert_review_and_dispatch`.

---

## 4. Audit Logging (Section 65)
The platform persists structured audit logs in PostgreSQL/PostGIS (`audit_logs` table) recording:
- Event timestamp (UTC ISO8601)
- User ID & Role
- Action type (`ALERT_DRAFT`, `ALERT_APPROVE`, `ALERT_SEND`, `SCENARIO_RUN`, `AI_TOOL_CALL`)
- Request ID & client IP address
- Action outcome and hash signature
