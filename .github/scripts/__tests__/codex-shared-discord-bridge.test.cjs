const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("codex-shared workflow supports signed Discord bridge delivery", () => {
  const workflowPath = path.join(
    __dirname,
    "..",
    "..",
    "workflows",
    "codex-shared.yml",
  );
  const workflow = fs.readFileSync(workflowPath, "utf8");

  assert.ok(
    workflow.includes("discord_bridge_url:"),
    "Expected workflow_call inputs to include discord_bridge_url.",
  );
  assert.ok(
    workflow.includes("discord_channel_map:"),
    "Expected workflow_call inputs to include discord_channel_map.",
  );
  assert.ok(
    workflow.includes("GH_WEBHOOK_SECRET:"),
    "Expected workflow_call secrets to include GH_WEBHOOK_SECRET.",
  );
  assert.ok(
    workflow.includes("DISCORD_CHANNEL_MAP:"),
    "Expected workflow_call secrets to include DISCORD_CHANNEL_MAP.",
  );
  assert.ok(
    workflow.includes("Resolve Discord channel for trigger user"),
    "Expected a step that resolves channel mapping for the trigger user.",
  );
  assert.ok(
    workflow.includes("steps.discord_channel.outputs.notify_discord == 'true'"),
    "Expected bridge posting steps to run only when per-user channel resolution succeeds.",
  );
  assert.ok(
    workflow.includes("DISCORD_CHANNEL_ID: ${{ steps.discord_channel.outputs.channel_id }}"),
    "Expected bridge event payload generation to read the resolved Discord channel ID.",
  );
  assert.ok(
    workflow.includes("Post Discord bridge event"),
    "Expected a step that prepares a signed Discord bridge payload.",
  );
  assert.ok(
    workflow.includes("Deliver Discord bridge event"),
    "Expected a step that delivers signed payloads to the bridge endpoint.",
  );
  assert.ok(
    workflow.includes("X-Hub-Signature-256"),
    "Expected bridge delivery to include an HMAC signature header.",
  );
  assert.ok(
    workflow.includes("X-GitHub-Event: codex.bridge"),
    "Expected bridge delivery to include a stable event name header.",
  );
  assert.ok(
    workflow.includes("inputs.discord_bridge_url == ''"),
    "Expected legacy webhook posting to be disabled when a bridge URL is configured.",
  );
});
