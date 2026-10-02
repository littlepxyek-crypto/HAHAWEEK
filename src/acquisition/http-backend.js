"use strict";

async function acquireHttp({ request, target, assertLease }) {
  const started_at = new Date().toISOString();
  assertLease();
  const response = await fetch(target.target, {
    method: "GET",
    redirect: "manual",
    signal: AbortSignal.timeout(request.policy.limits.timeout_ms),
    headers: { "accept": "*/*", "user-agent": "HAHAWEEK-A9-Acquisition/1.0" },
  });
  assertLease();
  if (!response.ok) {
    return {
      started_at,
      completed_at: new Date().toISOString(),
      status: response.status === 404 || response.status === 410 ? "UNAVAILABLE" : "FAILED",
      content_type: response.headers.get("content-type") || "application/octet-stream",
      provenance: { http: { status: response.status, status_text: response.statusText } },
    };
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > request.policy.limits.max_response_bytes) throw new Error("RESPONSE_SIZE_LIMIT_EXCEEDED");
  assertLease();
  return {
    started_at,
    completed_at: new Date().toISOString(),
    status: "OBSERVED",
    content_type: response.headers.get("content-type") || "application/octet-stream",
    content: bytes,
    provenance: { http: { status: response.status, status_text: response.statusText } },
  };
}

module.exports = { acquireHttp };
