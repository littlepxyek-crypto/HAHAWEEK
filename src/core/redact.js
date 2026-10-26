'use strict';

/*
 * Redaction for RPC endpoints.
 *
 * Keyed RPC providers put the API key in the path (/v2/<key>), the query
 * string (?apikey=...), or userinfo. Only scheme + host[:port] are safe to
 * print or persist. A URL with nothing after the host is returned unchanged
 * so existing source identifiers (e.g. the public Robinhood RPC) stay stable.
 */

const REDACTED = 'redacted';

function redactUrl(value) {
  if (typeof value !== 'string' || value === '') return value;

  let url;
  try {
    url = new URL(value);
  } catch {
    // Not a parseable URL: do not echo it back, it may still contain a key.
    return `[${REDACTED}]`;
  }

  const hasSecretParts =
    url.username !== '' ||
    url.password !== '' ||
    (url.pathname !== '' && url.pathname !== '/') ||
    url.search !== '' ||
    url.hash !== '';

  if (!hasSecretParts) return value;

  return `${url.protocol}//${url.host}/${REDACTED}`;
}

/*
 * Replace every URL-looking substring (and every explicitly known secret URL)
 * in free text, e.g. ethers error messages that embed `requestUrl`.
 */
function redactText(text, knownUrls = []) {
  if (typeof text !== 'string' || text === '') return text;

  let out = text;
  for (const known of knownUrls) {
    if (typeof known === 'string' && known !== '') {
      out = out.split(known).join(redactUrl(known));
    }
  }

  return out.replace(/\b[a-z][a-z0-9+.-]*:\/\/[^\s"'<>()\]]+/gi, match => redactUrl(match));
}

module.exports = {
  REDACTED,
  redactUrl,
  redactText,
};
