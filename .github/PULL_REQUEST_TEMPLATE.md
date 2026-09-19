## HAHAWEEK Pull Request Safety Checklist

### Change type
- [ ] feature
- [ ] fix
- [ ] documentation
- [ ] test
- [ ] security
- [ ] performance

### Integrity
- [ ] No historical evidence was silently rewritten or deleted.
- [ ] SQLite is not being treated as the sole evidence source.
- [ ] Cursor/checkpoint semantics remain safe.
- [ ] Reorg/canonicality behavior is preserved.
- [ ] Provenance remains traceable.

### Security
- [ ] No secrets, private keys, tokens, or credentials are included.
- [ ] No production database/raw event store is included.
- [ ] No environment file is included.
- [ ] Diff was reviewed for accidental sensitive data.

### Validation
- [ ] Tests pass locally.
- [ ] Security/secret checks pass.
- [ ] Relevant documentation was updated.
- [ ] Rollback/recovery impact was considered.

### Evidence
Describe the observed result and how it was verified.
