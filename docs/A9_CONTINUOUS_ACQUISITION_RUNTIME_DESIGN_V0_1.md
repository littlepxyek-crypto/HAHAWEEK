# A9 Continuous Acquisition Runtime Design v0.1

Execution is not authority.

The runtime is a stable execution boundary above A8. It validates requests, resolves DNS, acquires a lease, invokes one explicitly selected backend, validates the returned AcquisitionResult, and persists an integrity-protected execution checkpoint.

Execution state is separate from raw/canonical evidence and from the blockchain cursor. Atomic temp-file + fsync + rename writes make checkpoint recovery independent of the process that performed the acquisition.

Current backend: HTTP GET only. Redirects are not followed. Credentials in URLs, localhost/private addresses, unapproved hosts/protocols, and missing DNS evidence are rejected by A8 policy.

There is no automatic fallback. Scrapling, Patchright, and Agent-Reach remain future adapters requiring separate authorization.

A9 deliberately does not mutate evidence stores, canonical state, formation/outcome/validation/radar projections, or blockchain cursors. A successful acquisition creates an observation boundary only.
