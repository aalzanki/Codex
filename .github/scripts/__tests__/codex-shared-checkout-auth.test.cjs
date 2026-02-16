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

test("codex-shared checkout resolves the shared script source via OIDC workflow claims", () => {
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

test("self-hosted-checkout keeps origin on SSH and does not use tokenized HTTPS git auth", () => {
  const scriptPath = path.join(__dirname, "..", "self-hosted-checkout.sh");
  const script = fs.readFileSync(scriptPath, "utf8");

  assert.ok(
    script.includes('repo_ssh="git@github.com:${repo_slug}.git"'),
    "Expected checkout script to define SSH origin URLs for GitHub."
  );
  assert.equal(
    script.includes("https://x-access-token:"),
    false,
    "Checkout script should not embed tokens in HTTPS origin URLs."
  );
  assert.equal(
    script.includes("AUTHORIZATION: basic"),
    false,
    "Checkout script should not build basic-auth headers for git operations."
  );
  assert.equal(
    script.includes("run_git_with_auth"),
    false,
    "Checkout script should not use helper wrappers that inject HTTP auth headers."
  );
  assert.ok(
    script.includes('git remote set-url origin "$repo_ssh"'),
    "Expected checkout script to keep origin configured as SSH."
  );
  assert.ok(
    script.includes("Clearing legacy GitHub HTTPS auth headers"),
    "Expected checkout script to clean up legacy HTTPS auth headers from older runs."
  );
  assert.ok(
    script.includes("cleaning workspace for recovery"),
    "Expected checkout script to clean workspace if it's non-empty but missing .git."
  );
  assert.ok(
    script.includes('git -C "$workspace" rev-parse --is-inside-work-tree'),
    "Expected checkout script to validate workspace with git rev-parse instead of only checking .git directory shape."
  );
  assert.ok(
    script.includes("filter.lfs.smudge="),
    "Expected checkout script to disable LFS smudge via per-command git config."
  );
  assert.ok(
    script.includes("filter.lfs.required=false"),
    "Expected checkout script to disable required LFS smudge during reset/checkout."
  );
  assert.equal(
    script.includes("GIT_LFS_SKIP_SMUDGE"),
    false,
    "Checkout script should avoid env-var toggles for LFS smudge behavior."
  );
  assert.ok(
    script.includes("git lfs pull"),
    "Expected checkout script to perform git lfs pull after checkout."
  );
});

test("self-hosted-checkout preserves ignored files cache semantics", () => {
  const scriptPath = path.join(__dirname, "..", "self-hosted-checkout.sh");
  const script = fs.readFileSync(scriptPath, "utf8");

  assert.ok(
    script.includes("git clean -df"),
    "Expected checkout script to use git clean -df (not removing ignored files)."
  );
  assert.equal(
    script.includes("git clean -dfx"),
    false,
    "Checkout script must not use -x, which would delete ignored files like node_modules."
  );
  assert.equal(
    script.includes("git clean -dffx"),
    false,
    "Checkout script must not use -x variants that delete ignored files."
  );
});
