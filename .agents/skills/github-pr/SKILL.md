---
name: github-pr
description: >-
  Automates checking out branches, staging changes, pushing commits to remote,
  and creating GitHub Pull Requests targeting the dev branch using the GitHub CLI (gh).
---

# GitHub PR Skill

Use this skill when the user asks to create a pull request (PR) and push changes to the `dev` branch.

## Quick Command Script
You can run the automated script directly or execute the steps manually:
```powershell
.\.agents\skills\github-pr\scripts\create_pr.ps1 -BranchName "feat/my-feature" -CommitMessage "feat: add my feature" -PRTitle "Add my feature"
```

---

## Detailed Step-by-Step Procedure

### 1. Verify Authentication & Remotes
Verify that the GitHub CLI (`gh`) is authenticated and git remote is set:
```powershell
gh auth status
git remote -v
```

### 2. Check and Ensure `dev` Branch Exists
Check if the `dev` branch exists on the remote or locally:
```powershell
git fetch origin
git branch -a
```
- If `origin/dev` does not exist yet:
  Create `dev` from current branch and push it to remote:
  ```powershell
  git checkout -b dev
  git push -u origin dev
  ```

### 3. Prepare Feature Branch
Create a new branch for the changes or work on the active branch:
```powershell
# Example: feature/setup-fastapi-react
git checkout -b <branch-name>
```

### 4. Stage and Commit Changes
Verify `.env`, `node_modules`, and `venv` are ignored, then stage files:
```powershell
git status
git add .
git commit -m "<type>(<scope>): <summary>"
```

### 5. Push Branch to GitHub
Push the branch to `origin`:
```powershell
git push -u origin <branch-name>
```

### 6. Create the Pull Request Targeting `dev`
Use `gh pr create` with `--base dev`:
```powershell
gh pr create --base dev --head <branch-name> --title "<PR Title>" --body "<Detailed description of changes>"
```

### 7. Output Result
Provide the user with the direct GitHub URL of the newly created Pull Request.
