---
"c15t": patch
---

- fix `identifyUser()` to consistently use the consent `subjectId` for `PATCH /subjects/:id`, keep the legacy `id` alias backward compatible, and tighten request typing plus retry handling for malformed pending identify submissions.
