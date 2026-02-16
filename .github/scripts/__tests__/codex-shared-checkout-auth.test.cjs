const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("codex-shared checkout does not persist tokenized origin URLs", () => {
  const workflowPath = path.join(
    __dirname,
    "..",
    "..",
    "workflows",
    "codex-shared.yml"
  );
  const workflow = fs.readFileSync(workflowPath, "utf8");

  assert.equal(
    workflow.includes("https://x-access-token:"),
    false,
    "Workflow should not embed tokens in https origin URLs."
  );
});

test("codex-shared checkout uses ephemeral extraheader git auth", () => {
  const workflowPath = path.join(
    __dirname,
    "..",
    "..",
    "workflows",
    "codex-shared.yml"
  );
  const workflow = fs.readFileSync(workflowPath, "utf8");

  assert.ok(
    workflow.includes("ACTIONS_ID_TOKEN_REQUEST_URL"),
    "Expected codex-shared workflow to use OIDC job_workflow_ref/job_workflow_sha to locate the shared checkout script."
  );
  assert.ok(
    workflow.includes("job_workflow_ref"),
    "Expected codex-shared workflow to read job_workflow_ref from the OIDC token."
  );
  assert.ok(
    workflow.includes(".github/scripts/self-hosted-checkout.sh"),
    "Expected codex-shared workflow to fetch the shared self-hosted-checkout script."
  );
});

test("self-hosted-checkout uses per-command extraheader auth and keeps origin non-auth", () => {
  const scriptPath = path.join(__dirname, "..", "self-hosted-checkout.sh");
  const script = fs.readFileSync(scriptPath, "utf8");

  assert.ok(
    script.includes("http.https://github.com/.extraheader"),
    "Expected checkout script to inject an ephemeral http extraheader for git auth."
  );
  assert.equal(
    script.includes("https://x-access-token:"),
    false,
    "Checkout script should not embed tokens in https origin URLs."
  );
  assert.ok(
    script.includes('git remote set-url origin "$repo_no_auth"'),
    "Expected checkout script to keep origin as a non-auth URL."
  );
  assert.ok(
    script.includes("cleaning workspace for recovery"),
    "Expected checkout script to clean workspace if it's non-empty but missing .git."
  );
});
