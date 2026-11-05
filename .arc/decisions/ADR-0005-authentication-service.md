---
id: ADR-0005
category: component
title: Authentication Service
status: accepted
superseded_by: null
component_id: comp_authentication_service
responsibility: Managed identity provider handling user login, session/token management,
  roles and permissions; the Core API validates its tokens; runs on Microsoft Entra
  ID.
kind: managed_service
split_reason: Security boundary for credentials and tokens; backing role named by
  the human.
evidence: 'human: ''Recommended: Microsoft Entra ID (Azure AD)'''
contested: true
alternatives_considered:
- 'Cloud-native IdP (Cognito): not chosen by the human'
- 'Built in the Core API: not chosen by the human'
consequences:
- Credentials and tokens stay outside the project's code and database
- Adds a third-party dependency and per-user licensing cost
---

## Context

human: 'Recommended: Microsoft Entra ID (Azure AD)'

## Decision

Managed identity provider handling user login, session/token management, roles and permissions; the Core API validates its tokens; runs on Microsoft Entra ID.

Kept separate because Security boundary for credentials and tokens; backing role named by the human..

## Alternatives considered

- Cloud-native IdP (Cognito): not chosen by the human
- Built in the Core API: not chosen by the human

## Consequences

- Credentials and tokens stay outside the project's code and database
- Adds a third-party dependency and per-user licensing cost
