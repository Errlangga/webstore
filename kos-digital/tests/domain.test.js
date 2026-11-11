"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { datePlusMonthsMinusOneDay, addDays } = require("../lib/domain");

test("contract periods end one day before the next monthly anniversary", () => {
  assert.equal(datePlusMonthsMinusOneDay("2026-11-11", 1), "2026-12-10");
  assert.equal(datePlusMonthsMinusOneDay("2026-11-11", 3), "2027-02-10");
  assert.equal(datePlusMonthsMinusOneDay("2026-11-11", 12), "2027-11-10");
});
test("month-end contracts handle shorter months", () => {
  assert.equal(datePlusMonthsMinusOneDay("2026-01-31", 1), "2026-02-27");
  assert.equal(datePlusMonthsMinusOneDay("2026-01-30", 1), "2026-02-27");
});
test("adds days across month and year boundaries", () => {
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
});
test("rejects invalid dates and durations", () => {
  assert.throws(() => datePlusMonthsMinusOneDay("2026-02-30", 1));
  assert.throws(() => datePlusMonthsMinusOneDay("2026-11-11", 0));
});
