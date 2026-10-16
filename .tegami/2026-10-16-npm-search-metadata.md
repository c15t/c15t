---
packages:
  c15t: patch
  '@c15t/react': patch
  '@c15t/translations': patch
  '@c15t/ui': patch
---

### Shorten npm descriptions and keywords

`c15t` and `@c15t/react` have shorter npm descriptions and keyword lists
that name what they are: a cookie consent manager and cookie banner.
`@c15t/translations` and `@c15t/ui` describe themselves as c15t
translations and UI primitives, so npm search shows the main `c15t` package
first for cookie consent and cookie banner searches. No code changes.
