"use strict";

const crypto = require("node:crypto");
const { canonicalUtf8 } = require("./jcs");

function domainSeparatedHash(domain, value) {
  if (typeof domain !== "string" || domain.length === 0) {
    throw new TypeError("domain must be a non-empty string");
  }

  const canonical = canonicalUtf8(value);
  const preimage = Buffer.concat([
    Buffer.from(domain, "utf8"),
    Buffer.from([0x00]),
    canonical,
  ]);

  return {
    canonicalUtf8: canonical,
    canonicalUtf8Hex: canonical.toString("hex"),
    hash: crypto.createHash("sha256").update(preimage).digest("hex"),
  };
}

module.exports = { domainSeparatedHash };
