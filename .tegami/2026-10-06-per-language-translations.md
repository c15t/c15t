---
packages:
  '@c15t/translations': minor
---

### Import one language at a time

Every bundled language now has its own entry point, such as
`@c15t/translations/de` or `@c15t/translations/fr`. Importing one registers
c15t's built-in copy for that language, so offline mode can switch to it and
app messages that repeat it don't hide backend edits, without loading every
other language. Each entry also exports the copy as `translations`.
`@c15t/translations/all` still loads them all.
