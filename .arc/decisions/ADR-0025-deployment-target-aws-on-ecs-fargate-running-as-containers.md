---
id: ADR-0025
category: deployment_target
title: "Deployment target: AWS on ECS Fargate, running as containers (Web App, Core\
  \ API, Background Worker\u2026"
status: accepted
superseded_by: null
component_id: null
rule: All components deploy as containers on ECS Fargate in us-east-1 with a data
  replica in us-west-2; prod and staging environments.
decision: 'AWS on ECS Fargate, running as containers (Web App, Core API, Background
  Worker and SAP Integration Service; PostgreSQL as the Relational Database; S3 for
  attachments). Primary region us-east-1 with a cross-region replica in us-west-2.
  Environments: prod and staging, starting with the single non-production environment
  from EPIC-017 over HTTPS for named reviewers.'
evidence: 'recommended default, accepted by the human without review; accepted architecture:
  AWS, containers, us-east-1 / us-west-2'
---

## Context

recommended default, accepted by the human without review; accepted architecture: AWS, containers, us-east-1 / us-west-2

## Decision

AWS on ECS Fargate, running as containers (Web App, Core API, Background Worker and SAP Integration Service; PostgreSQL as the Relational Database; S3 for attachments). Primary region us-east-1 with a cross-region replica in us-west-2. Environments: prod and staging, starting with the single non-production environment from EPIC-017 over HTTPS for named reviewers.
