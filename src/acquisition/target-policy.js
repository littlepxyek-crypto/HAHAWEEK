"use strict";

const net = require("node:net");

const DEFAULT_LIMITS = Object.freeze({
  timeout_ms: 30000,
  max_response_bytes: 5 * 1024 * 1024,
  max_concurrency: 1,
  max_retries: 0,
});
const PROTOCOLS = Object.freeze(["https:", "http:"]);

function assertPositiveInteger(value, code) {
  if (!Number.isInteger(value) || value <= 0) throw new TypeError(code);
}
function normalizeHost(value) {
  if (typeof value !== "string" || !value.trim()) throw new TypeError("HOST_REQUIRED");
  return value.trim().toLowerCase().replace(/\.$/, "");
}
function isPrivateOrSpecialIp(address) {
  const family = net.isIP(address);
  if (family === 4) {
    const [a, b] = address.split(".").map(Number);
    return a === 10 || a === 127 || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a === 0;
  }
  if (family === 6) {
    const v = address.toLowerCase();
    return v === "::1" || v === "::" || /^f[cd]/.test(v) || /^fe[89ab]/.test(v);
  }
  return false;
}
function createTargetPolicy(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError("TARGET_POLICY_REQUIRED");
  const allowed_protocols = Object.freeze([...(input.allowed_protocols || [])]);
  if (!allowed_protocols.every((p) => PROTOCOLS.includes(p))) throw new TypeError("PROTOCOL_UNSUPPORTED");
  const allowed_hosts = Object.freeze([...(input.allowed_hosts || [])].map(normalizeHost));
  const limits = {
    timeout_ms: input.timeout_ms ?? DEFAULT_LIMITS.timeout_ms,
    max_response_bytes: input.max_response_bytes ?? DEFAULT_LIMITS.max_response_bytes,
    max_concurrency: input.max_concurrency ?? DEFAULT_LIMITS.max_concurrency,
    max_retries: input.max_retries ?? DEFAULT_LIMITS.max_retries,
  };
  assertPositiveInteger(limits.timeout_ms, "TIMEOUT_INVALID");
  assertPositiveInteger(limits.max_response_bytes, "RESPONSE_SIZE_LIMIT_INVALID");
  assertPositiveInteger(limits.max_concurrency, "CONCURRENCY_LIMIT_INVALID");
  if (!Number.isInteger(limits.max_retries) || limits.max_retries < 0) throw new TypeError("RETRY_LIMIT_INVALID");
  const max_redirects = input.max_redirects ?? 0;
  if (!Number.isInteger(max_redirects) || max_redirects < 0) throw new TypeError("MAX_REDIRECTS_INVALID");
  if (input.allow_redirects !== true && max_redirects !== 0) throw new Error("REDIRECT_POLICY_INVALID");
  return Object.freeze({
    allowed_protocols, allowed_hosts,
    allow_private_network: input.allow_private_network === true,
    allow_localhost: input.allow_localhost === true,
    reject_credentials_in_url: input.reject_credentials_in_url !== false,
    allow_redirects: input.allow_redirects === true,
    max_redirects,
    dns_resolution_required: input.dns_resolution_required !== false,
    proxy: input.proxy || null,
    limits: Object.freeze(limits),
  });
}
function validateTarget(target, policy, resolvedAddresses = []) {
  if (!policy || typeof policy !== "object") throw new TypeError("TARGET_POLICY_REQUIRED");
  if (typeof target !== "string" || !target) throw new TypeError("TARGET_REQUIRED");
  let url;
  try { url = new URL(target); } catch { throw new Error("TARGET_URL_INVALID"); }
  if (!policy.allowed_protocols.includes(url.protocol)) throw new Error("TARGET_PROTOCOL_FORBIDDEN");
  if (policy.reject_credentials_in_url && (url.username || url.password)) throw new Error("TARGET_CREDENTIALS_FORBIDDEN");
  const hostname = normalizeHost(url.hostname);
  if (!policy.allowed_hosts.includes(hostname)) throw new Error("TARGET_HOST_FORBIDDEN");
  if (!policy.allow_localhost && (hostname === "localhost" || hostname.endsWith(".localhost"))) {
    throw new Error("TARGET_LOCALHOST_FORBIDDEN");
  }
  if (!policy.allow_private_network && net.isIP(hostname) && isPrivateOrSpecialIp(hostname)) {
    throw new Error("TARGET_PRIVATE_NETWORK_FORBIDDEN");
  }
  if (policy.dns_resolution_required) {
    if (!Array.isArray(resolvedAddresses) || resolvedAddresses.length === 0) throw new Error("TARGET_DNS_RESOLUTION_REQUIRED");
    for (const address of resolvedAddresses) {
      if (typeof address !== "string" || net.isIP(address) === 0) throw new Error("TARGET_DNS_RESULT_INVALID");
      if (!policy.allow_private_network && isPrivateOrSpecialIp(address)) throw new Error("TARGET_DNS_PRIVATE_NETWORK_FORBIDDEN");
    }
  }
  return Object.freeze({
    target: url.href,
    protocol: url.protocol,
    hostname,
    resolved_addresses: Object.freeze([...resolvedAddresses]),
  });
}
module.exports = { PROTOCOLS, DEFAULT_LIMITS, createTargetPolicy, validateTarget, isPrivateOrSpecialIp };
