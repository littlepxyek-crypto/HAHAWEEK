"use strict";

function isPlainObject(value) {
  if (value === null || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function assertJsonValue(value, path = "$") {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    if (typeof value === "string") {
      for (let i = 0; i < value.length; i += 1) {
        const code = value.charCodeAt(i);
        if (code >= 0xd800 && code <= 0xdbff) {
          const next = value.charCodeAt(i + 1);
          if (!(next >= 0xdc00 && next <= 0xdfff)) {
            throw new TypeError(`Invalid lone high surrogate at ${path}`);
          }
          i += 1;
        } else if (code >= 0xdc00 && code <= 0xdfff) {
          throw new TypeError(`Invalid lone low surrogate at ${path}`);
        }
      }
    }
    return;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError(`Non-finite number at ${path}`);
    }
    return;
  }

  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i += 1) {
      assertJsonValue(value[i], `${path}[${i}]`);
    }
    return;
  }

  if (isPlainObject(value)) {
    for (const key of Object.keys(value)) {
      assertJsonValue(value[key], `${path}.${key}`);
    }
    return;
  }

  throw new TypeError(`Unsupported JSON value at ${path}`);
}

function escapeString(value) {
  return JSON.stringify(value);
}

function canonicalize(value) {
  assertJsonValue(value);

  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }

  if (typeof value === "number") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(",")}]`;
  }

  const keys = Object.keys(value).sort();
  const members = keys.map((key) => `${escapeString(key)}:${canonicalize(value[key])}`);
  return `{${members.join(",")}}`;
}

function canonicalUtf8(value) {
  return Buffer.from(canonicalize(value), "utf8");
}

module.exports = {
  canonicalize,
  canonicalUtf8,
};
