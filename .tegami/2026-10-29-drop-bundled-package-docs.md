---
packages:
  '@c15t/backend': minor
  '@c15t/cli': minor
---

### Stop bundling docs in `@c15t/backend` and `@c15t/cli`

The packages no longer ship `docs/`, `AGENTS.md` or `SKILL.md`. These Markdown
files added size to every install and deploy without being read at runtime.
Read the docs at [c15t.com/docs](https://c15t.com/docs) or through
[llms.txt](https://c15t.com/docs/llms.txt).
