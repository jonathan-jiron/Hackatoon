import { test } from "node:test";
import assert from "node:assert/strict";

const { plainText } = await import("../src/pipeline.ts");

test("plainText strips Markdown the channel would show raw", () => {
  assert.equal(plainText("Curso **Arduino** a $40"), "Curso Arduino a $40");
  assert.equal(plainText("# Título\ntexto `código`"), "Título\ntexto código");
  assert.equal(plainText("**a**\n**b**"), "a\nb");
});
