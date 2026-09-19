"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { canonicalize, canonicalUtf8 } = require("../src/reference/v4/jcs");

test("RFC 8785 property-order conformance example", () => {
  const input = {
    "\u20ac": "Euro Sign",
    "\r": "Carriage Return",
    "\ufb33": "Hebrew Letter Dalet With Dagesh",
    "1": "One",
    "\ud83d\ude00": "Emoji: Grinning Face",
    "\u0080": "Control",
    "\u00f6": "Latin Small Letter O With Diaeresis",
  };

  const expected =
    '{"\\r":"Carriage Return","1":"One","\\u0080":"Control","\\u00f6":"Latin Small Letter O With Diaeresis","€":"Euro Sign","😀":"Emoji: Grinning Face","\ufb33":"Hebrew Letter Dalet With Dagesh"}';

  assert.equal(canonicalize(input), expected);
});

test("RFC 8785 number serialization samples use ECMAScript JSON serialization", () => {
  const samples = [
    [0, "0"],
    [-0, "0"],
    [Number.MIN_VALUE, "5e-324"],
    [-Number.MIN_VALUE, "-5e-324"],
    [Number.MAX_VALUE, "1.7976931348623157e+308"],
    [-Number.MAX_VALUE, "-1.7976931348623157e+308"],
    [9007199254740992, "9007199254740992"],
    [295147905179352830000, "295147905179352800000"],
    [9.999999999999997e22, "9.999999999999997e+22"],
    [1e23, "1e+23"],
    [1.0000000000000001e23, "1.0000000000000001e+23"],
  ];

  for (const [value, expected] of samples) {
    assert.equal(canonicalize(value), expected);
  }
});

test("RFC 8785 rejects non-I-JSON non-finite numbers", () => {
  assert.throws(() => canonicalize(NaN), /Non-finite number/);
  assert.throws(() => canonicalize(Infinity), /Non-finite number/);
  assert.throws(() => canonicalize(-Infinity), /Non-finite number/);
});

test("RFC 8785 rejects lone surrogate strings", () => {
  assert.throws(() => canonicalize("\ud800"), /lone high surrogate/);
  assert.throws(() => canonicalize("\udfff"), /lone low surrogate/);
});

test("RFC 8785 canonical output is UTF-8", () => {
  const value = { text: "€😀" };
  const bytes = canonicalUtf8(value);
  assert.equal(bytes.toString("utf8"), canonicalize(value));
  assert.equal(bytes.toString("hex"), "7b2274657874223a22e282acf09f9880227d");
});
