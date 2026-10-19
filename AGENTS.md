# MCT Agents & Skills Registry

This workspace is configured with specialized agent personas and on-demand skills under `.agents/`.

## Available Agents
- **`github-pr`** ([.agents/agents/github-pr.md](file:///c:/Users/Shelley/Desktop/projects/python/MCT-Companies-Centralized-Financial-Management-System/.agents/agents/github-pr.md)): Specialized in staging changes, creating semantic branch names, pushing commits to remote, and opening pull requests to the `dev` branch via the GitHub CLI.

## Available Skills
- **`github-pr`** ([.agents/skills/github-pr/SKILL.md](file:///c:/Users/Shelley/Desktop/projects/python/MCT-Companies-Centralized-Financial-Management-System/.agents/skills/github-pr/SKILL.md)): Automated workflow runbook for git branching, pushing to remote, and generating pull requests targeting `dev`.
- **`code-reviewer`** ([.agents/skills/code-reviewer/SKILL.md](file:///c:/Users/Shelley/Desktop/projects/python/MCT-Companies-Centralized-Financial-Management-System/.agents/skills/code-reviewer/SKILL.md)): Automated static analysis, security check, and code quality review before submitting pull requests.

## General Project Conventions
- The base integration branch is `dev`.
- Production branch is `main`.
- All PRs should have a clear descriptive title following conventional commits (e.g. `feat:`, `fix:`, `chore:`, `docs:`) and a structured body.
