# Security Policy

## Scope
HAHAWEEK is an Early Formation Intelligence system. The repository may contain application code, specifications, tests, and non-secret engineering documentation.

Runtime state, raw production evidence, local databases, checkpoints, backups, credentials, private keys, API tokens, and other secrets MUST NOT be committed to Git.

## Security invariants
- Secrets are supplied through the runtime environment or an approved secret store, never source files.
- Historical evidence is append-only and must not be silently rewritten.
- Production raw evidence and runtime databases remain outside Git.
- SQLite is derived state; it is not the sole source of evidence truth.
- Cursor advancement requires durable evidence and checkpoint validation.
- RPC failure, timeout, partial acquisition, wrong-chain responses, and valid empty ranges must remain distinguishable.
- Reorgs must be represented as canonicality transitions; historical observations are not rewritten.
- X/publication artifacts are derivatives and are not the source of truth.
- Integrity-critical artifacts require deterministic identity/canonicalization and verifiable provenance.

## Safe contribution workflow
Use a branch and pull request for engineering changes.

Before merge:
1. Run the test suite.
2. Review the diff for secrets and runtime data.
3. Confirm historical evidence has not been rewritten or deleted.
4. Confirm schema/provenance changes are documented.
5. Confirm the change has a clear commit message.
6. Resolve security and integrity findings before production activation.

## Incident handling
If a credential, private key, API token, or other secret is committed:
1. Treat it as compromised immediately.
2. Revoke/rotate it at the issuing provider.
3. Remove it from the working tree.
4. Assess whether Git history contains the secret.
5. Rewrite history only under a controlled incident procedure after rotation.
6. Record the incident without publishing the secret.

Do not report secrets in issues or pull requests.

## Production boundary
The repository is not a backup for production databases or raw event stores. Production recovery and evidence preservation must use the authoritative evidence/checkpoint mechanism defined by the HAHAWEEK persistence protocol.
