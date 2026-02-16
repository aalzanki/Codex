# codex-shared

This repo provides a reusable self-hosted GitHub Actions workflow you can call from other repos to run Codex when someone mentions `@codex` on an issue or pull request.

## Quickstart

Create `.github/workflows/codex.yml` in the repo where you want Codex to run:

```yaml
name: Codex

on:
  issue_comment:
    types: [created]
  issues:
    types: [opened, assigned]

jobs:
  codex:
    if: |
      (github.event_name == 'issue_comment' && (
        github.event.comment.body == '@codex' ||
        startsWith(github.event.comment.body, '@codex ') ||
        startsWith(github.event.comment.body, format('@codex{0}', fromJSON('"\n"'))) ||
        startsWith(github.event.comment.body, format('@codex{0}', fromJSON('"\r\n"'))) ||
        github.event.comment.body == '@codex-canary' ||
        startsWith(github.event.comment.body, '@codex-canary ') ||
        startsWith(github.event.comment.body, format('@codex-canary{0}', fromJSON('"\n"'))) ||
        startsWith(github.event.comment.body, format('@codex-canary{0}', fromJSON('"\r\n"')))
      )) ||
      (github.event_name == 'issues' && (
        (github.event.issue.body || '') == '@codex' ||
        startsWith(github.event.issue.body || '', '@codex ') ||
        startsWith(github.event.issue.body || '', format('@codex{0}', fromJSON('"\n"'))) ||
        startsWith(github.event.issue.body || '', format('@codex{0}', fromJSON('"\r\n"'))) ||
        (github.event.issue.body || '') == '@codex-canary' ||
        startsWith(github.event.issue.body || '', '@codex-canary ') ||
        startsWith(github.event.issue.body || '', format('@codex-canary{0}', fromJSON('"\n"'))) ||
        startsWith(github.event.issue.body || '', format('@codex-canary{0}', fromJSON('"\r\n"'))) ||
        (github.event.issue.title || '') == '@codex' ||
        startsWith(github.event.issue.title || '', '@codex ') ||
        (github.event.issue.title || '') == '@codex-canary' ||
        startsWith(github.event.issue.title || '', '@codex-canary ')
      ))
    uses: aalzanki/Codex-Shared/.github/workflows/codex-shared.yml@main
    permissions:
      actions: write
      checks: write
      contents: write
      deployments: write
      id-token: write
      issues: write
      discussions: write
      packages: write
      pages: write
      pull-requests: write
      repository-projects: write
      security-events: write
      statuses: write
    secrets:
      CODEX_GITHUB_APP_ID: ${{ secrets.CODEX_GITHUB_APP_ID }}
      CODEX_GITHUB_APP_PRIVATE_KEY: ${{ secrets.CODEX_GITHUB_APP_PRIVATE_KEY }}
      CODEX_GH_TOKEN: ${{ secrets.CODEX_GH_TOKEN }}
    with:
      trigger_phrase: '@codex'
      runner_group: 'YOUR_RUNNER_GROUP_NAME'
      model: 'gpt-5.3-codex'
```

Then:

1. Create a GitHub App and install it on the target repo (details below).
1. Add the required secrets to the target repo (or org-level secrets).
1. Make sure you have self-hosted runners in the runner group you set in `runner_group`.
1. Trigger a run by commenting `@codex` (or `@codex-canary`) on an issue/PR, or by opening an issue whose title/body starts with the trigger phrase.

## GitHub App Setup (Required)

This workflow mints an installation token at runtime using `actions/create-github-app-token`, so you must create a GitHub App and install it on any repo where you run the workflow.

1. Create the app in GitHub:

GitHub UI path: Settings -> Developer settings -> GitHub Apps -> New GitHub App.

| Setting | Value |
| --- | --- |
| Location | Your org/user where the repos live |
| Homepage URL | Any valid URL (required by GitHub) |
| Webhook | Disable it (uncheck "Active") if you don't need webhooks |

1. Set GitHub App permissions:

| Repository permission | Access |
| --- | --- |
| Contents | Read & write |
| Pull requests | Read & write |
| Issues | Read & write |

1. Create the app, then copy the **App ID**.
1. Generate a private key (`.pem`) from the app settings page.
1. Install the app on your org/repo(s) where you will run the workflow.
1. Add the app credentials as secrets in the target repo (or as org secrets).

Required secrets in the target repo:

- `CODEX_GITHUB_APP_ID`: The GitHub App ID (a number).
- `CODEX_GITHUB_APP_PRIVATE_KEY`: The GitHub App private key in PEM format (multi-line is fine).

## CODEX_GH_TOKEN (Required)

The workflow also requires a GitHub token secret:

- `CODEX_GH_TOKEN`: A GitHub token with access to the target repo (for example a fine-grained PAT or classic PAT).

This token is used by the workflow to post/update the final response comment, and it is also embedded into the prompt to let Codex download GitHub attachments from private repos.


## Runner Requirements

The workflow runs on a self-hosted runner group (`runs-on: group: ...`). Your runner needs:

- `codex` installed and available at `~/.local/bin/codex`, `/opt/homebrew/bin/codex`, or in `PATH`

## Optional Repo Variables

You can set these repository variables to control commit attribution:

- `CODEX_GIT_USER_NAME`
- `CODEX_GIT_USER_EMAIL`

## Workflow Inputs

The reusable workflow supports:

- `trigger_phrase` (required): Used to label the assistant in the prompt (for example `@codex`). Set to `@chat` to run in chat-only mode (no code changes).
- `runner_group` (required): Self-hosted runner group name.
- `model` (required): Passed to `codex exec --model`.
- `extra_instructions` (optional): Appended to the assistant instruction block.
- `extra_common_instructions` (optional): Appended to the shared/common instruction block.
- `extra_env` (optional): Newline-separated `KEY=VALUE` pairs injected into the runtime environment (non-secret only).
- `extra_secret_env_1_name` .. `extra_secret_env_5_name` (optional): Environment variable names mapped to `secrets.EXTRA_SECRET_ENV_1` .. `secrets.EXTRA_SECRET_ENV_5`.

## Links

- [miniExtensions](https://miniextensions.com)
- [iScoot](https://iscoot.game)
