const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("codex-shared prompt wording stays consistent with Issue/PR labels", () => {
  const workflowPath = path.join(
    __dirname,
    "..",
    "..",
    "workflows",
    "codex-shared.yml"
  );
  const workflow = fs.readFileSync(workflowPath, "utf8");

  assert.equal(
    workflow.includes("\t"),
    false,
    "Workflow should not contain tab characters (YAML indentation must be spaces)."
  );

  assert.ok(
    workflow.includes("Associated PR"),
    'Expected workflow to include "Associated PR" section headings.'
  );
  assert.ok(
    workflow.includes("Associated Issue"),
    'Expected workflow to include "Associated Issue" section headings.'
  );
  assert.ok(
    workflow.includes("Triggering PR"),
    'Expected workflow to include "Triggering PR" section headings.'
  );
  assert.ok(
    workflow.includes("Triggering Issue"),
    'Expected workflow to include "Triggering Issue" section headings.'
  );
  assert.ok(
    workflow.includes("Latest comments:"),
    'Expected workflow to label comment blocks as "Latest comments:".'
  );

  const bannedPhrases = [
    "Primary thread:",
    "Associated thread:",
    "🧩 Primary context:",
    "🧩 Associated context:",
  ];

  for (const phrase of bannedPhrases) {
    assert.ok(
      !workflow.includes(phrase),
      `Expected workflow to avoid phrase: ${JSON.stringify(phrase)}`
    );
  }
});
