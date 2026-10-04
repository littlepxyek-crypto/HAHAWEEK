# HAHAWEEK — ACQUISITION COMPLETENESS CONTRACT v1

Status: IMPLEMENTED / TESTED / RUNTIME VERIFICATION REQUIRED

## Purpose

Acquisition completeness answers whether the system has sufficient
coverage to interpret absence of expected evidence.

It is distinct from the acquisition result itself.

## Statuses

- COMPLETE
- PARTIAL
- FAILED
- UNKNOWN
- EXPIRED

Only COMPLETE permits a downstream rule to interpret absence as a negative
observation, and only when the downstream rule explicitly requires that
absence.

PARTIAL, FAILED, UNKNOWN, and EXPIRED never become negative evidence.

## Required temporal context

- requested_start
- requested_end
- observed_until
- terminal
- failure state
- expiration state

The contract is deterministic and versioned.

## Authority boundary

Completeness is analytical/acquisition metadata. It does not mutate V4
evidence authority and does not advance the V4 cursor.
