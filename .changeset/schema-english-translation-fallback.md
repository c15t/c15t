---
'@c15t/schema': patch
---

Stop bundling every translation language into shared schema consumers. Manifest resolvers can now receive an explicit base translation map, while callers that omit it use English and receive a one-time warning when requesting another language.
