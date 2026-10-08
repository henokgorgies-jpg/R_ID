# Product Backlog

Structured implementation plan with phases, priority, and effort estimates.

## Phase 1: Core Governance and Data Integrity (1-2 weeks)

1. Pending Approval Queue Page
- Priority: P0
- Estimate: 2-3 days
- Deliverables:
  - Super-admin page for pending residents
  - Bulk approve/reject actions
  - Filters by zone/woreda/kebele/date

2. Reject Flow with Reason
- Priority: P0
- Estimate: 1-2 days
- Deliverables:
  - Reject endpoint and UI action
  - Mandatory rejection reason
  - Audit log entry for reject

3. Relationship Graph Validation
- Priority: P0
- Estimate: 2-3 days
- Deliverables:
  - Block invalid family structures
  - Prevent circular parent/head linkage
  - Server-side integrity validation errors

4. Edit Parent/Family Linkage
- Priority: P1
- Estimate: 2 days
- Deliverables:
  - Edit UI fields for mother/father/head links
  - API validation parity with create flow

## Phase 2: Household and ID Operations (1-2 weeks)

1. Household Profile Module
- Priority: P1
- Estimate: 3-4 days
- Deliverables:
  - Household details page
  - Member list grouped by role
  - Head/spouse/children/relative summary cards

2. Reissue Workflow Hardening
- Priority: P1
- Estimate: 2 days
- Deliverables:
  - Reissue reason capture
  - Reissue confirmation + preview
  - Stronger history metadata in timeline

3. Role-Based Action Visibility
- Priority: P1
- Estimate: 1-2 days
- Deliverables:
  - Hide/show approve/reissue/generate by permission
  - Consistent server + UI enforcement

4. Resident and ID Export
- Priority: P2
- Estimate: 2-3 days
- Deliverables:
  - CSV export for residents
  - CSV/PDF export for issued IDs
  - Filter-aware export scope

## Phase 3: Quality, Print, and Production Readiness (1 week)

1. Automated Test Coverage
- Priority: P1
- Estimate: 3-4 days
- Deliverables:
  - API tests: create/approve/issue/reissue/validation
  - UI tests: register flow + ID history timeline
  - Smoke tests for permissions

2. ID Card Print Standardization
- Priority: P2
- Estimate: 1-2 days
- Deliverables:
  - Exact CR80 print profile
  - Print CSS tuning (margins/bleed)
  - Browser print consistency checks

3. Final Visual Assets and Security Patterns
- Priority: P2
- Estimate: 1-2 days
- Deliverables:
  - Real logo assets
  - Final watermark/guilloche tuning
  - Scan-safe QR/barcode stress verification

## Cross-Cutting Tasks (Parallel)

1. Documentation Maintenance
- Priority: P1
- Estimate: ongoing
- Deliverables:
  - Keep `README.md` setup and workflow current
  - Add API usage snippets for admin operations

2. Data Migration Safety
- Priority: P0
- Estimate: ongoing
- Deliverables:
  - Migration rollback notes
  - Backup checklist before schema changes

## Milestone Checkpoints

1. M1 (End Phase 1)
- Pending approval + reject + family validation are stable.

2. M2 (End Phase 2)
- Household module and ID operational workflows are complete.

3. M3 (End Phase 3)
- Test coverage and print-ready production behavior complete.

