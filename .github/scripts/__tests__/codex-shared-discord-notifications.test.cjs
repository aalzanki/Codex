const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("codex-shared workflow uses mapping-only Discord webhook configuration", () => {
  const workflowPath = path.join(
    __dirname,
    "..",
    "..",
    "workflows",
    "codex-shared.yml"
  );
  const workflow = fs.readFileSync(workflowPath, "utf8");

  assert.ok(
    workflow.includes("discord_webhook_map:"),
    "Expected workflow_call inputs to include discord_webhook_map."
  );
  assert.ok(
    workflow.includes("DISCORD_WEBHOOK_MAP:"),
    "Expected workflow_call secrets to include DISCORD_WEBHOOK_MAP."
  );

  assert.equal(
    workflow.includes("discord_webhook_url:"),
    false,
    "Workflow should not include fallback discord_webhook_url input."
  );
  assert.equal(
    workflow.includes("DISCORD_WEBHOOK_URL:\n        required: false"),
    false,
    "Workflow should not include fallback DISCORD_WEBHOOK_URL workflow_call secret."
  );
});

test("codex-shared workflow posts Discord notifications only with mapped webhook and final comment URL", () => {
  const workflowPath = path.join(
    __dirname,
    "..",
    "..",
    "workflows",
    "codex-shared.yml"
  );
  const workflow = fs.readFileSync(workflowPath, "utf8");

  assert.ok(
    workflow.includes("Resolve Discord webhook for trigger user"),
    "Expected a step that resolves webhook mapping for the trigger user."
  );
  assert.ok(
    workflow.includes("Post Discord completion notification"),
    "Expected a step that posts Discord completion notifications."
  );
  assert.ok(
    workflow.includes("steps.discord_webhook.outputs.webhook_url != ''"),
    "Expected Discord post step to require a resolved mapped webhook URL."
  );
  assert.ok(
    workflow.includes("steps.post_response.outputs.comment_url != ''"),
    "Expected Discord post step to require the exact final GitHub comment URL."
  );
  assert.ok(
    workflow.includes("output.write(f\"trigger_login={trigger_login}\\n\")"),
    "Expected workflow to export trigger_login from Build Codex prompt."
  );
  assert.ok(
    workflow.includes("core.setOutput('comment_url', commentUrl);"),
    "Expected workflow to expose the final GitHub comment URL for notifications."
  );
  assert.ok(
    workflow.includes("curl --fail --silent --show-error"),
    "Expected Discord notification delivery to use curl transport."
  );
  assert.ok(
    workflow.includes("--retry 3"),
    "Expected Discord notification delivery to retry transient transport failures."
  );
});
