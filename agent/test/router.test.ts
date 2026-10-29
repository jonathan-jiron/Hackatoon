import { test } from "node:test";
import assert from "node:assert/strict";
import { matchCourseByName, normalize } from "../src/router.ts";

const courses = [
  { slug: "curso19", title: "Preparación GitHub Certified: Agentic AI Developer (GH-600)" },
  { slug: "curso20", title: "Preparación Arduino Certification Program" },
  { slug: "curso21", title: "Fundamentos de Python 2 – Certified Associate Python Programmer" },
];

test("normalize strips accents and punctuation", () => {
  assert.equal(normalize("¿Qué CURSOS tienen?"), "que cursos tienen");
});

test("matches a course by a word unique to its title", () => {
  assert.equal(matchCourseByName("quiero el de arduino", courses), "curso20");
  assert.equal(matchCourseByName("cuánto cuesta Python?", courses), "curso21");
});

test("does not match on generic or missing words", () => {
  assert.equal(matchCourseByName("curso de preparación", courses), null);
  assert.equal(matchCourseByName("curso de java", courses), null);
});
