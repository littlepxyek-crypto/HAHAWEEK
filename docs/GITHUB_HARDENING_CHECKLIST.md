# HAHAWEEK — GitHub Hardening Checklist

## Repository settings to enforce

These controls are intentionally separate from source-code CI because repository rules are account-level controls.

### Main branch

The following controls are now **verified active** on `main` through the repository ruleset `HAHAWEEK-main-protection`:

- Require pull request before merging.
- Require the security/regression CI check to pass.
- Require branches to be up to date before merge.
- Require conversation resolution.
- Dismiss stale approvals after new changes.
- Require additional approval for unattributed Copilot changes.
- Disable force pushes.
- Disable branch deletion.
- No bypass actors are configured.
- Allowed merge methods are merge, squash, and rebase.
- Required approving review count is currently 0 because this repository does not currently have an independent reviewer configured.

### Actions

- Default workflow permissions: read-only.
- Do not use `pull_request_target` for untrusted code unless there is a documented security review.
- Pin third-party actions to immutable commit SHAs.
- Keep workflow secrets to the minimum required scope.
- Never print secrets.
- Do not expose secrets to fork pull requests.

The HAHAWEEK `test-and-security` workflow currently uses `contents: read`, disables persisted checkout credentials, and pins its GitHub Actions dependencies to commit SHAs.

### Secrets and dependency security

The repository currently has:

- Secret scanning: enabled.
- Push protection: enabled.
- Secret scanning alerts: 0 open.
- Dependabot alerts: 0 open.
- Code scanning alerts: 0 open.
- CodeQL: working as expected.

### Releases / production

Production deployment must be a separate controlled gate.
CI for pull requests must not deploy production or mutate production evidence.

## Verification record

The previous note stating that repository-level ruleset configuration was not exposed as a writable operation is obsolete.

The repository ruleset is now verified as active:

- Ruleset: `HAHAWEEK-main-protection`
- Target: default branch (`main`)
- Enforcement: active
- Bypass actors: none
- Required status check: `test-and-security`

The hardening state is therefore documented as an **active and verified repository control**, not merely a planned manual control.

## Verification checklist

1. Direct push to main is restricted by the required pull-request rule.
2. Force push is blocked.
3. Branch deletion is blocked.
4. Required CI must pass before merge.
5. Branches must be up to date before merge.
6. Conversation resolution is required.
7. Workflow permissions remain read-only.
8. Secret scanning and push protection are active.
9. Dependabot and code-scanning alert surfaces are currently clean.
10. Production deployment remains behind an explicit gate.
