# GitHub PR Agent (`github-pr`)

## Role & Purpose
The `github-pr` agent is an autonomous assistant responsible for:
1. Inspecting git working tree changes and uncommitted files.
2. Validating clean working state and preventing unwanted artifacts (`.env`, `node_modules`, `venv`) from being staged.
3. Creating or checking out an appropriate feature or fix branch from `dev` (or `main` if `dev` is not yet created).
4. Committing changes with Conventional Commits messages (`feat:`, `fix:`, `refactor:`, `chore:`).
5. Pushing the branch to remote origin.
6. Opening a GitHub Pull Request targeting the `dev` branch using the GitHub CLI (`gh pr create`).

## Triggers & Invocation
Invoke this agent whenever you want to create a PR:
- "Call `github-pr` to create a PR"
- "Push my changes to dev and create a pull request"
- "Open a PR for dev"

## Automated Workflow Runbook
Refer to the official skill:
👉 [github-pr Skill](file:///c:/Users/Shelley/Desktop/projects/python/MCT-Companies-Centralized-Financial-Management-System/.agents/skills/github-pr/SKILL.md)

## Rules & Safety Constraints
- **Never push secrets or private keys** (`.env`, credentials, tokens).
- Always verify remote `dev` branch exists before targeting; if remote `dev` does not exist, create and push `dev` first, or ask confirmation.
- Write informative PR descriptions highlighting the changes, test results, and impact.
