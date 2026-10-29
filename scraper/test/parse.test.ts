import { test } from "node:test";
import assert from "node:assert/strict";
import { parseDateRange, parsePrice } from "../src/parse.ts";

test("parseDateRange handles full and shared-year ranges", () => {
  assert.deepEqual(parseDateRange("Del 16 de octubre de 2026 al 05 de diciembre de 2026"), [
    "2026-10-16T00:00:00-05:00",
    "2026-12-05T00:00:00-05:00",
  ]);
  assert.deepEqual(parseDateRange("Del 08 de abril al 8 de mayo del 2024"), [
    "2024-04-08T00:00:00-05:00",
    "2024-05-08T00:00:00-05:00",
  ]);
  assert.deepEqual(parseDateRange("Por definir"), [null, null]);
});

test("parsePrice handles both formats", () => {
  assert.equal(parsePrice("Estudiantes UTA: $120,00"), 120);
  assert.equal(parsePrice("30 USD Estudiantes"), 30);
  assert.equal(parsePrice("sin precio"), null);
});
