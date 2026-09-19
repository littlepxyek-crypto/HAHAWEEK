# HAHAWEEK — GitHub Hardening Checklist

## Repository settings to enforce

These controls are intentionally separate from source-code CI because repository rules are account-level controls.

### Main branch
Configure branch protection/rulesets for main:

- Require pull request before merging.
- Require at least one approving review where the repository has an independent reviewer.
- Dismiss stale approvals after new changes.
- Require conversation resolution.
- Require the security/regression CI check to pass.
- Require branches to be up to date before merge when practical.
- Disable force pushes.
- Disable branch deletion.
- Restrict direct pushes to main.
- Do not allow bypass of the rules except for a documented break-glass procedure.

### Actions
- Default workflow permissions: read-only.
- Do not use pull_request_target for untrusted code unless there is a documented security review.
- Pin third-party actions to immutable commit SHAs.
- Keep workflow secrets to the minimum required scope.
- Never print secrets.
- Do not expose secrets to fork pull requests.

### Secrets and dependency security
Where available for the repository/account:
- enable secret scanning;
- enable push protection;
- enable Dependabot security updates;
- review dependency alerts;
- review GitHub Actions dependency updates.

### Releases / production
Production deployment must be a separate controlled gate.
CI for pull requests must not deploy production or mutate production evidence.

## Current repository limitation

The available repository integration can create and review repository content and pull requests, but repository-level branch protection/ruleset configuration is not exposed as a writable operation here.

Therefore this checklist is recorded as a manual GitHub control rather than falsely claiming that branch protection has already been enabled.

## Verification

After configuring the settings, verify:
1. Direct push to main is blocked.
2. Force push is blocked.
3. PR merge is blocked when required CI fails.
4. Workflow permissions remain read-only.
5. Secret scanning/push protection is active if available.
6. Production deployment remains behind an explicit gate.
