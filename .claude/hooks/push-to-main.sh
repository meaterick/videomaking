#!/usr/bin/env bash
# Auto-push to main — PostToolUse hook on Bash.
# After a Bash call that ran `git commit`, push HEAD to origin/main.
# Never force-pushes: a rejected (non-fast-forward / protected) push is
# reported back to Claude (exit 2) so it can integrate origin/main and retry.
set -u
input=$(cat)
cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // empty' 2>/dev/null)

# Only react to commits: `git commit`, `git -C dir commit`, `... && git commit ...`
if ! printf '%s' "$cmd" | grep -Eq '(^|[^[:alnum:]_.-])git([[:space:]]+-[Cc][[:space:]]+[^[:space:]]+)*[[:space:]]+commit([[:space:]]|$)'; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$PWD}" 2>/dev/null || exit 0
git rev-parse --verify -q HEAD >/dev/null || exit 0
git remote get-url origin >/dev/null 2>&1 || exit 0

out=""
for delay in 0 2 4 8; do
  sleep "$delay"
  if out=$(git push origin HEAD:main 2>&1); then
    case "$out" in *"Everything up-to-date"*) exit 0 ;; esac
    jq -cn --arg sha "$(git rev-parse --short HEAD)" \
      '{systemMessage: ("main에 자동으로 올렸습니다 (" + $sha + ")")}'
    exit 0
  fi
  # Don't retry rejections; only retry transient network failures.
  case "$out" in *rejected*|*non-fast-forward*|*"fetch first"*|*protected*|*denied*|*" 403"*) break ;; esac
done

printf 'Auto-push to origin/main failed (no force push was attempted):\n%s\n' "$out" >&2
printf 'Fetch origin/main, integrate it (merge, or rebase only local-only commits), then push HEAD:main again.\n' >&2
exit 2
