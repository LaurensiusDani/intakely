import assert from "node:assert/strict";
import test from "node:test";
import { dayForMonth, monthWeeks, shiftMonth, todayInJakarta } from "../src/diary/calendar.ts";

test("today changes at midnight in Jakarta", () => {
  assert.equal(todayInJakarta(Date.parse("2026-11-22T16:59:59Z")), "2026-11-22");
  assert.equal(todayInJakarta(Date.parse("2026-11-22T17:00:00Z")), "2026-11-23");
});

test("direct month selection can jump years and refuses future months", () => {
  assert.equal(dayForMonth("2021", 2, "2026-11-23"), "2021-02-01");
  assert.equal(dayForMonth("2026", 11, "2026-11-23"), "2026-11-23");
  assert.equal(dayForMonth("2026", 12, "2026-11-23"), null);
  assert.equal(dayForMonth("0000", 1, "2026-11-23"), null);
});

test("month navigation uses the first day and crosses year boundaries", () => {
  assert.equal(shiftMonth("2026-01-31", 1), "2026-02-01");
  assert.equal(shiftMonth("2026-01-01", -1), "2025-12-01");
  assert.equal(shiftMonth("2026-12-01", 1), "2027-01-01");
});

test("month grids start on Monday and include the leap day", () => {
  const weeks = monthWeeks("2024-02-01");
  assert.deepEqual(weeks[0].slice(0, 4), [null, null, null, "2024-02-01"]);
  assert.equal(weeks.flat().filter(Boolean).length, 29);
  assert.equal(weeks.at(-1)[3], "2024-02-29");
  assert.equal(monthWeeks("2026-02-01").flat().filter(Boolean).length, 28);
});
