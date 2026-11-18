---
id: ADR-0037
category: cross_cutting
title: 'Cross-cutting: Sign-in and role model'
status: accepted
superseded_by: null
component_id: null
rule: Users authenticate only through Entra ID; roles come from the token and are
  enforced server-side.
decision: Entra ID is the only identity provider; the Core API reads the Lead or Member
  role from the sign-in token and enforces it on every action. Other role sets in
  the backlog (Buyer/Admin/CSR, Reporter/Developer/Tester, WFC roles), mocked POC
  users, local email/password and Facebook sign-up are not provided for.
evidence: recommended default, accepted by the human without review
---

## Context

recommended default, accepted by the human without review

## Decision

Entra ID is the only identity provider; the Core API reads the Lead or Member role from the sign-in token and enforces it on every action. Other role sets in the backlog (Buyer/Admin/CSR, Reporter/Developer/Tester, WFC roles), mocked POC users, local email/password and Facebook sign-up are not provided for.
