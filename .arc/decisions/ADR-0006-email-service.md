---
id: ADR-0006
category: component
title: Email Service
status: accepted
superseded_by: null
component_id: comp_email_service
responsibility: Sends emails, alerts, invitations, password resets and notifications;
  primary delivery via Microsoft 365 (Microsoft Graph Mail API), with SendGrid as
  fallback.
kind: managed_service
split_reason: Backing service the project uses but does not build.
evidence: 'human: ''Primary: Microsoft 365 via Microsoft Graph Mail API; Fallback:
  SendGrid'''
---

## Context

human: 'Primary: Microsoft 365 via Microsoft Graph Mail API; Fallback: SendGrid'

## Decision

Sends emails, alerts, invitations, password resets and notifications; primary delivery via Microsoft 365 (Microsoft Graph Mail API), with SendGrid as fallback.

Kept separate because Backing service the project uses but does not build..
