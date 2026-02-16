const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("codex-shared workflow does not hardcode personal identities or private repo defaults", () => {
  const workflowPath = path.join(
    __dirname,
    "..",
    "..",
    "workflows",
    "codex-shared.yml"
  );
  const workflow = fs.readFileSync(workflowPath, "utf8");

  const bannedNeedles = [
    "githubLoginToName",
    "github_login_to_name",
    "talking_to",
    "Abdul",
    "AJayQ8",
    "aalzanki",
    "INTERCOM_ACCESS_TOKEN",
    "AIRTABLE_TASKS_PAT",
    "default: 'ci-prod'",
    "default: \"ci-prod\"",
  ];

  for (const needle of bannedNeedles) {
    assert.ok(
      !workflow.includes(needle),
      `Expected workflow to not include: ${JSON.stringify(needle)}`
    );
  }
});
