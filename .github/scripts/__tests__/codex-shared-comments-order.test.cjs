const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("codex-shared prompt ends with trigger thread comments", () => {
  const workflowPath = path.join(
    __dirname,
    "..",
    "..",
    "workflows",
    "codex-shared.yml"
  );
  const workflow = fs.readFileSync(workflowPath, "utf8");

  const linkedNeedle =
    /sections\.push\(\s*formatThreadContextSection\(\s*'associated'/;
  const primaryNeedle =
    /sections\.push\(\s*formatThreadContextSection\(\s*'triggering'/;

  assert.match(
    workflow,
    linkedNeedle,
    "Expected workflow to format associated context sections."
  );
  assert.match(
    workflow,
    primaryNeedle,
    "Expected workflow to format triggering context sections."
  );
  assert.ok(
    workflow.search(linkedNeedle) < workflow.search(primaryNeedle),
    "Expected codex prompt to list linked context comments before the triggering thread so the prompt ends with the trigger thread."
  );
});
