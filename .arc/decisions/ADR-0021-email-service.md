---
id: ADR-0021
category: component
title: Email Service
status: accepted
superseded_by: null
component_id: comp_email_service
responsibility: Sends alerts, invitations, notifications and order confirmations;
  primary delivery via Microsoft 365 (Graph Mail API), SendGrid as fallback.
kind: managed_service
serves:
- TESTING-04-NOV-EPIC-006
- TESTING-04-NOV-EPIC-024
split_reason: Backing service the project uses but does not build.
rule: All outbound email goes through the Email Service; application code never sends
  mail directly.
evidence: EPIC-006, EPIC-024
---

## Context

EPIC-006, EPIC-024

Serves: TESTING-04-NOV-EPIC-006, TESTING-04-NOV-EPIC-024.

## Decision

Sends alerts, invitations, notifications and order confirmations; primary delivery via Microsoft 365 (Graph Mail API), SendGrid as fallback.

Kept separate because Backing service the project uses but does not build..
