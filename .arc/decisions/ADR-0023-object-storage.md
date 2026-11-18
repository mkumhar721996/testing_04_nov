---
id: ADR-0023
category: component
title: Object Storage
status: accepted
superseded_by: null
component_id: comp_object_storage
responsibility: Stores defect attachments (up to 5 files of 10 MB each, executables
  blocked); runs on Amazon S3.
kind: managed_service
serves:
- TESTING-04-NOV-EPIC-003
split_reason: Backing service the project uses but does not build; keeps large binaries
  out of the database
rule: Attachment files are stored only in Object Storage, written and read through
  the Core API; the database keeps metadata only.
evidence: recommended default, accepted by the human without review; STORY-017
---

## Context

recommended default, accepted by the human without review; STORY-017

Serves: TESTING-04-NOV-EPIC-003.

## Decision

Stores defect attachments (up to 5 files of 10 MB each, executables blocked); runs on Amazon S3.

Kept separate because Backing service the project uses but does not build; keeps large binaries out of the database.
