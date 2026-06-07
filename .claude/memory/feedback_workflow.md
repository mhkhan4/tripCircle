---
name: feedback-workflow
description: After finishing changes, always update ARCHITECTURE.md (if architectural) and push to GitHub
metadata:
  type: feedback
---

After completing any set of changes:
1. If the change affects architecture (new DB columns, new libraries, new patterns, new flows) — update ARCHITECTURE.md to reflect it.
2. Always commit and push to GitHub so changes get deployed.

**Why:** User explicitly requested this as standard workflow on 2026-06-06.

**How to apply:** At the end of every work session, before reporting done: update ARCHITECTURE.md if needed, then `git add`, `git commit`, `git push`.
