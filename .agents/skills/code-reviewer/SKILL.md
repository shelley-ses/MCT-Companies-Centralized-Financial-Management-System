---
name: code-reviewer
description: >-
  Performs pre-PR code review, checking code style, safety vulnerabilities,
  proper typing, and ensuring no sensitive files (.env, keys) are committed.
---

# Code Reviewer Skill

Use this skill before running `github-pr` to ensure the codebase remains clean, secure, and compliant with MCT architecture.

## Review Checklist
1. **Security & Secrets**: Ensure no API keys, credentials, or `.env` files are tracked.
2. **Backend (FastAPI)**:
   - Proper Pydantic schema validation for request/response models.
   - Clean async/sync endpoint signatures.
   - Correct status codes (e.g. `201 Created` for resource creation, `404 Not Found` for missing entities).
3. **Frontend (React)**:
   - Error handling around fetch/API calls.
   - Clean component modularity and responsive CSS design.
4. **Git Hygiene**:
   - Meaningful commit messages using Conventional Commits.
