#!/usr/bin/env bash
set -euo pipefail

workspace="${GITHUB_WORKSPACE}"
branch="${BRANCH:-}"
ref_sha="${REF_SHA:-}"
ensure_file_path="${ENSURE_FILE_PATH:-}"
repo_slug="${GITHUB_REPOSITORY}"
# Self-hosted runners are expected to authenticate GitHub git operations over SSH.
# Keep origin as SSH so later fetch/push operations in this job never depend on HTTPS auth headers.
repo_ssh="git@github.com:${repo_slug}.git"

cleanup_typescript_cache() {
  local ts_build_info="${workspace}/tsconfig.tsbuildinfo"
  if [ -f "$ts_build_info" ]; then
    echo "Removing stale TypeScript incremental cache: ${ts_build_info}"
    rm -f "$ts_build_info"
  fi
}

is_valid_git_workspace() {
  [ -d "$workspace" ] && git -C "$workspace" rev-parse --is-inside-work-tree >/dev/null 2>&1
}

if [ -z "$branch" ]; then
  echo "::error::Target branch is empty."
  exit 1
fi

run_git_without_lfs_smudge() {
  git \
    -c filter.lfs.process= \
    -c filter.lfs.smudge= \
    -c filter.lfs.required=false \
    "$@"
}

echo "Checking out ${repo_ssh} @ ${branch} (${ref_sha})"

workspace_is_non_empty=false
if [ -d "$workspace" ] && [ -n "$(ls -A "$workspace")" ]; then
  workspace_is_non_empty=true
fi

if [ "$workspace_is_non_empty" = true ] && ! is_valid_git_workspace; then
  git_marker_state="missing"
  if [ -e "$workspace/.git" ]; then
    if [ -d "$workspace/.git" ]; then
      git_marker_state="directory (invalid)"
    else
      git_marker_state="file/symlink (invalid)"
    fi
  fi
  echo "::warning::Workspace is non-empty but not a valid git worktree (.git state: ${git_marker_state}); cleaning workspace for recovery."
  find "$workspace" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
fi

mkdir -p "$workspace"

if ! is_valid_git_workspace; then
  echo "Workspace is not a valid git worktree; cloning ${repo_ssh} into ${workspace}"
  git clone "$repo_ssh" "$workspace"
fi

git config --global --add safe.directory "$workspace"

cd "$workspace"
# Migration cleanup: older revisions used HTTPS + per-command extraheader auth.
if git config --local --get-all http.https://github.com/.extraheader >/dev/null 2>&1; then
  echo "Clearing legacy GitHub HTTPS auth headers from local repo config"
  git config --local --unset-all http.https://github.com/.extraheader || true
fi
if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "$repo_ssh"
else
  git remote add origin "$repo_ssh"
fi

# Keep ignored directories (for example node_modules) for faster self-hosted runs.
if git rev-parse --verify HEAD >/dev/null 2>&1; then
  run_git_without_lfs_smudge reset --hard HEAD
else
  echo "Repository has no valid HEAD yet; skipping pre-fetch hard reset."
fi
git clean -df
cleanup_typescript_cache

set +e
fetch_status=0
for attempt in 1 2 3; do
  git fetch --prune origin
  fetch_status=$?
  if [ $fetch_status -eq 0 ]; then
    break
  fi
  echo "git fetch failed (attempt ${attempt}/3, exit ${fetch_status}); retrying..."
  sleep $((attempt * 2))
done
set -e
if [ $fetch_status -ne 0 ]; then
  echo "::error::git fetch failed for ${repo_ssh} (exit ${fetch_status}). Ensure the runner has GitHub SSH access and a trusted github.com host key."
  exit $fetch_status
fi

if ! git show-ref --verify --quiet "refs/remotes/origin/$branch"; then
  echo "::error::Remote branch origin/$branch not found in ${repo_ssh}"
  exit 1
fi

run_git_without_lfs_smudge checkout -f -B "$branch" "origin/$branch"
if [ -n "$ref_sha" ]; then
  run_git_without_lfs_smudge reset --hard "$ref_sha"
else
  run_git_without_lfs_smudge reset --hard "origin/$branch"
fi
git clean -df
cleanup_typescript_cache

if git lfs version >/dev/null 2>&1; then
  set +e
  lfs_pull_status=0
  for attempt in 1 2 3; do
    git lfs pull
    lfs_pull_status=$?
    if [ $lfs_pull_status -eq 0 ]; then
      break
    fi
    echo "git lfs pull failed (attempt ${attempt}/3, exit ${lfs_pull_status}); retrying..."
    sleep $((attempt * 2))
  done
  set -e
  if [ $lfs_pull_status -ne 0 ]; then
    echo "::error::git lfs pull failed for ${repo_ssh} (exit ${lfs_pull_status}). Ensure the runner SSH identity can read repository LFS objects."
    echo "::error::Inspect runner diagnostics with: git lfs logs last"
    exit $lfs_pull_status
  fi
else
  echo "::warning::git-lfs is not installed on this runner; LFS pointer files will remain in the workspace."
fi

if [ -n "$ensure_file_path" ] && [ ! -f "$ensure_file_path" ]; then
  echo "::error::Checkout succeeded but required file is still missing: ${ensure_file_path}"
  exit 1
fi
