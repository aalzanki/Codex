#!/usr/bin/env bash
set -euo pipefail

workspace="${GITHUB_WORKSPACE}"
branch="${BRANCH:-}"
ref_sha="${REF_SHA:-}"
token="${TOKEN:-}"
token_label="${TOKEN_LABEL:-GitHub token}"
ensure_file_path="${ENSURE_FILE_PATH:-}"
repo_slug="${GITHUB_REPOSITORY}"
repo_no_auth="https://github.com/${repo_slug}.git"
auth_extraheader=""

cleanup_typescript_cache() {
  local ts_build_info="${workspace}/tsconfig.tsbuildinfo"
  if [ -f "$ts_build_info" ]; then
    echo "Removing stale TypeScript incremental cache: ${ts_build_info}"
    rm -f "$ts_build_info"
  fi
}

if [ -z "$branch" ]; then
  echo "::error::Target branch is empty."
  exit 1
fi

if [ -z "$token" ]; then
  echo "::error::${token_label} is empty."
  exit 1
fi

auth_basic="$(printf 'x-access-token:%s' "$token" | base64 | tr -d '\r\n')"
auth_extraheader="AUTHORIZATION: basic ${auth_basic}"

run_git_with_auth() {
  git -c "http.https://github.com/.extraheader=${auth_extraheader}" "$@"
}

echo "Checking out ${repo_no_auth} @ ${branch} (${ref_sha})"

if [ -d "$workspace" ] && [ -n "$(ls -A "$workspace")" ] && [ ! -d "$workspace/.git" ]; then
  echo "::warning::Workspace is non-empty but missing .git; cleaning workspace for recovery."
  find "$workspace" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
fi

mkdir -p "$workspace"

if [ ! -d "$workspace/.git" ]; then
  echo "Workspace missing .git; cloning ${repo_no_auth} into ${workspace}"
  run_git_with_auth clone "$repo_no_auth" "$workspace"
fi

git config --global --add safe.directory "$workspace"

cd "$workspace"
if git config --local --get-all http.https://github.com/.extraheader >/dev/null 2>&1; then
  echo "Clearing persisted GitHub auth headers from local repo config"
  git config --local --unset-all http.https://github.com/.extraheader || true
fi
if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "$repo_no_auth"
else
  git remote add origin "$repo_no_auth"
fi

# Keep ignored directories (for example node_modules) for faster self-hosted runs.
if git rev-parse --verify HEAD >/dev/null 2>&1; then
  git reset --hard HEAD
else
  echo "Repository has no valid HEAD yet; skipping pre-fetch hard reset."
fi
git clean -df
cleanup_typescript_cache

set +e
fetch_status=0
for attempt in 1 2 3; do
  run_git_with_auth fetch --prune origin
  fetch_status=$?
  if [ $fetch_status -eq 0 ]; then
    break
  fi
  echo "git fetch failed (attempt ${attempt}/3, exit ${fetch_status}); retrying..."
  sleep $((attempt * 2))
done
set -e
if [ $fetch_status -ne 0 ]; then
  echo "::error::git fetch failed for ${repo_no_auth} (exit ${fetch_status}). If the log shows 'Repository not found', the token likely lacks access."
  exit $fetch_status
fi

if ! git show-ref --verify --quiet "refs/remotes/origin/$branch"; then
  echo "::error::Remote branch origin/$branch not found in ${repo_no_auth}"
  exit 1
fi

git checkout -f -B "$branch" "origin/$branch"
if [ -n "$ref_sha" ]; then
  git reset --hard "$ref_sha"
else
  git reset --hard "origin/$branch"
fi
git clean -df
cleanup_typescript_cache

if [ -n "$ensure_file_path" ] && [ ! -f "$ensure_file_path" ]; then
  echo "::error::Checkout succeeded but required file is still missing: ${ensure_file_path}"
  exit 1
fi

