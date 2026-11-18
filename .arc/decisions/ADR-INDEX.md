# ADR Index

One line per decision — the rule, not the reasoning. Read the full ADR (`.arc/decisions/ADR-NNNN-*.md`) for context and rationale.

## Accepted — binding rules

| ADR | Category | Status | Rule |
|---|---|---|---|
| ADR-0007 | nfr | accepted | The system supports ~500 registered and ~100 concurrent users without degradation. |
| ADR-0010 | integration_surface | accepted | Users sign in only through Entra ID; roles are read from the sign-in token. |
| ADR-0011 | integration_surface | accepted | Email is sent via Microsoft Graph first and falls back to SendGrid only on failure. |
| ADR-0016 | component | accepted | The Web App calls only the Core API (and the identity provider for sign-in); it never reaches the database or third parties directly. |
| ADR-0017 | component | accepted | All business rules, authorization checks and database access live in the Core API; clients never reach the database directly. |
| ADR-0019 | component | accepted | Scheduled, notification and retry work runs in the Background Worker, never in the API request path; it shares the database but does not own the schema. |
| ADR-0020 | component | accepted | Credentials and tokens are handled only by Entra ID; the Core API validates tokens and never stores passwords. |
| ADR-0021 | component | accepted | All outbound email goes through the Email Service; application code never sends mail directly. |
| ADR-0023 | component | accepted | Attachment files are stored only in Object Storage, written and read through the Core API; the database keeps metadata only. |
| ADR-0024 | nfr | accepted | Web App and Core API uptime stays at or above 99.5% per month. |
| ADR-0026 | integration_surface | accepted | SAP is reached only by the SAP Integration Service (Python RFC client), with one configurable connection per SAP instance. |
| ADR-0028 | integration_surface | accepted | Card data never touches the application's servers or database; payments go through Stripe. |
| ADR-0029 | cross_cutting | accepted | Data is encrypted in transit and at rest; audit history is kept in the database. |
| ADR-0030 | cross_cutting | accepted | The deployment is single tenant; no per-tenant schema or database. |
| ADR-0031 | cross_cutting | accepted | Every query and SAP call is scoped to the caller's Distributor or Organization on the server. |
| ADR-0033 | cross_cutting | accepted | The Web App talks to one API, the Core API; add no per-domain services or gateway without a recorded decision. |
| ADR-0034 | component | accepted | The schema changes only through versioned migrations owned by the Core API. |
| ADR-0035 | component | accepted | All SAP access goes through the SAP Integration Service, written in Python; no other component holds SAP connections or RFC code. |
| ADR-0036 | deployment_target | accepted | Application components deploy as containers on ECS Fargate in us-east-1; PostgreSQL runs on RDS with a replica in us-west-2; prod and staging environments. |
| ADR-0037 | cross_cutting | accepted | Users authenticate only through Entra ID; roles come from the token and are enforced server-side. |
| ADR-0038 | cross_cutting | accepted | SAP traffic leaves AWS only through the site-to-site VPN; SAP instances are never exposed publicly. |
| ADR-0039 | cross_cutting | accepted | The banking dashboard shows mock data only; no real card numbers or banking integration are added without a recorded decision. |
| ADR-0040 | cross_cutting | accepted | Demos, feedback logs and close-out summaries are project activities, not components. |

## Superseded and retired — not binding

| ADR | Category | Status | Title |
|---|---|---|---|
| ADR-0001 | component | superseded by ADR-0016 | Web App |
| ADR-0002 | component | superseded by ADR-0017 | Core API |
| ADR-0003 | component | superseded by ADR-0018 | Relational Database |
| ADR-0004 | component | superseded by ADR-0019 | Background Worker |
| ADR-0005 | component | superseded by ADR-0020 | Authentication Service |
| ADR-0006 | component | superseded by ADR-0021 | Email Service |
| ADR-0008 | nfr | superseded by ADR-0024 | NFR: Availability — >= 99.5% per month (~3.6 h downtime) |
| ADR-0009 | deployment_target | superseded by ADR-0025 | Deployment target: AWS, running as containers (Web App, Core API and Background Worker as… |
| ADR-0012 | integration_surface | retired | Integration: Salesforce (bidirectional) |
| ADR-0013 | cross_cutting | superseded by ADR-0029 | Cross-cutting: No compliance regime or data-residency requirement |
| ADR-0014 | cross_cutting | superseded by ADR-0030 | Cross-cutting: Single-tenant data model |
| ADR-0015 | cross_cutting | retired | Cross-cutting: Salesforce integration ownership deferred |
| ADR-0018 | component | superseded by ADR-0034 | Relational Database |
| ADR-0022 | component | superseded by ADR-0035 | SAP Integration Service |
| ADR-0025 | deployment_target | superseded by ADR-0036 | Deployment target: AWS on ECS Fargate, running as containers (Web App, Core API, Background Worker… |
| ADR-0027 | integration_surface | retired | Integration: Facebook (inbound) |
| ADR-0032 | cross_cutting | superseded by ADR-0037 | Cross-cutting: Sign-in and role model |
