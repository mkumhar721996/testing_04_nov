---
id: ADR-0020
category: component
title: Authentication Service
status: accepted
superseded_by: null
component_id: comp_authentication_service
responsibility: Managed identity provider for sign-in, tokens and role claims; runs
  on Microsoft Entra ID. The Core API validates its tokens.
kind: managed_service
serves:
- TESTING-04-NOV-EPIC-005
- TESTING-04-NOV-EPIC-031
split_reason: Security boundary for credentials and tokens; backing role named by
  the human.
rule: Credentials and tokens are handled only by Entra ID; the Core API validates
  tokens and never stores passwords.
evidence: 'accepted architecture: Entra ID; EPIC-005; STORY-048'
contested: true
alternatives_considered:
- 'Cloud-native IdP (Cognito): not chosen by the human'
- 'Built in the Core API: not chosen by the human'
consequences:
- Credentials and tokens stay outside the project's code and database
- Adds a third-party dependency and per-user licensing cost
---

## Context

accepted architecture: Entra ID; EPIC-005; STORY-048

Serves: TESTING-04-NOV-EPIC-005, TESTING-04-NOV-EPIC-031.

## Decision

Managed identity provider for sign-in, tokens and role claims; runs on Microsoft Entra ID. The Core API validates its tokens.

Kept separate because Security boundary for credentials and tokens; backing role named by the human..

## Alternatives considered

- Cloud-native IdP (Cognito): not chosen by the human
- Built in the Core API: not chosen by the human

## Consequences

- Credentials and tokens stay outside the project's code and database
- Adds a third-party dependency and per-user licensing cost
