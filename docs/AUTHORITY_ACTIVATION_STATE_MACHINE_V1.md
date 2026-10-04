# HAHAWEEK — AUTHORITY ACTIVATION STATE MACHINE v1

Status: IMPLEMENTED / VERIFIED — CI HEAD 3f88ed877ab1f45924b4383f2867c6c6412e8529

## Purpose

V4 production authority activation is a separate lifecycle from code
implementation and verification.

The states are:

INACTIVE
→ IMPLEMENTED
→ VERIFIED
→ AUTHORIZED
→ ACTIVE

An ACTIVE authority may be explicitly deactivated to INACTIVE.

## Required verification

The VERIFIED transition requires all of:

- checkpoint_verified
- cursor_verified
- recovery_verified
- replay_verified
- negative_vectors_passed

VERIFIED does not mean AUTHORIZED.

AUTHORIZED requires explicit authorization.

ACTIVE additionally requires:

- production_gate_passed
- production_enabled

## Safety invariant

Production authority must remain non-active until the activation state
machine reaches ACTIVE through every required transition.

No state may be skipped.

This state machine does not itself mutate V4 evidence, cursor, checkpoint,
or manifest.
