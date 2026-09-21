"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { canonicalize } = require("../src/reference/v4/jcs");

test("RFC 8785: primitive and nested canonicalization example", () => {
  const input = {
    numbers: [333333333.33333329, 1E30, 4.50, 2e-3, 1e-27],
    string: "€$\u000f\nA'B\"\\/",
    literals: [null, true, false]
  };

  const expected =
    '{"literals":[null,true,false],"numbers":[333333333.3333333,1e+30,4.5,0.002,1e-27],"string":"€$\\u000f\\nA\'B\\\"\\\\/"}';

  assert.equal(canonicalize(input), expected);
});

test("RFC 8785: property ordering follows UTF-16 code-unit order", () => {
  const input = {
    "\u20ac": "Euro Sign",
    "\r": "Carriage Return",
    "\ufb33": "Hebrew Letter Dalet With Dagesh",
    "1": "One",
    "\ud83d\ude00": "Emoji: Grinning Face",
    "\u0080": "Control",
    "\u00f6": "Latin Small Letter O With Diaeresis"
  };

  assert.equal(
    canonicalize(input),
    '{"\\r":"Carriage Return","1":"One","\u0080":"Control","ö":"Latin Small Letter O With Diaeresis","€":"Euro Sign","😀":"Emoji: Grinning Face","דּ":"Hebrew Letter Dalet With Dagesh"}'
  );
});

test("RFC 8785: number serialization boundary samples", () => {
  const samples = [
    [0, "0"],
    [-0, "0"],
    [Number.MIN_VALUE, "5e-324"],
    [-Number.MIN_VALUE, "-5e-324"],
    [Number.MAX_VALUE, "1.7976931348623157e+308"],
    [-Number.MAX_VALUE, "-1.7976931348623157e+308"],
    [9007199254740992, "9007199254740992"],
    [-9007199254740992, "-9007199254740992"],
    [1e23, "1e+23"],
    [1e21, "1e+21"],
    [1e-6, "0.000001"],
    [1e-7, "1e-7"]
  ];

  for (const [value, expected] of samples) {
    assert.equal(canonicalize(value), expected);
  }
});

test("RFC 8785: non-finite and lone-surrogate values are rejected", () => {
  assert.throws(() => canonicalize(NaN), /Non-finite number/);
  assert.throws(() => canonicalize(Infinity), /Non-finite number/);
  assert.throws(() => canonicalize("\ud800"), /lone high surrogate/);
  assert.throws(() => canonicalize("\udc00"), /lone low surrogate/);
});
