---
id: ADR-0032
category: cross_cutting
title: 'Cross-cutting: Sign-in and role model'
status: accepted
superseded_by: null
component_id: null
rule: Users authenticate only through Entra ID; roles come from the token and are
  enforced server-side.
decision: Entra ID is the only identity provider; the Core API reads the Lead or Member
  role from the sign-in token and enforces it on every action. Other role sets in
  the backlog (Buyer/Admin/CSR, Reporter/Developer/Tester, WFC roles) and local email/password
  or Facebook sign-up are not provided for.
evidence: recommended default, accepted by the human without review
contested: true
alternatives_considered:
- Entra ID with Reporter/Developer/Tester/Lead roles
- Entra ID plus a local user store for mocked and self-registered users
consequences:
- Backlog stories needing other role sets or self-registration (EPIC-010, EPIC-026)
  will need reconciling or a later change
---

## Context

recommended default, accepted by the human without review

## Decision

Entra ID is the only identity provider; the Core API reads the Lead or Member role from the sign-in token and enforces it on every action. Other role sets in the backlog (Buyer/Admin/CSR, Reporter/Developer/Tester, WFC roles) and local email/password or Facebook sign-up are not provided for.

## Alternatives considered

- Entra ID with Reporter/Developer/Tester/Lead roles
- Entra ID plus a local user store for mocked and self-registered users

## Consequences

- Backlog stories needing other role sets or self-registration (EPIC-010, EPIC-026) will need reconciling or a later change
