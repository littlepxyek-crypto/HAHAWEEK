# HAHAWEEK — AUTHORITY ACTIVATION STATE MACHINE v1

Status: IMPLEMENTED / VERIFIED — exact main CI HEAD 3456647fa28a96c4ab327eb40d905138e302e370

Verification basis: post-merge main runtime/security/test gates completed successfully on this exact HEAD; V4 production authority remains INACTIVE.

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
