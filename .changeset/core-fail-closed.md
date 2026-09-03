---
'@c15t/core': patch
---

Keep v3 consent initialization closed when the backend or manifest transport fails: withhold provisional consent UI, retry init with visibility-aware backoff, and replay failed consent saves after recovery for up to seven days or ten attempts.

Queued saves carry the visitor's original `givenAt`, so a replay records when consent was given and derives the same backend consent id instead of a duplicate. A later successful save for the same subject drops its queued predecessor, queue updates take a Web Locks API lock so tabs cannot overwrite each other, and a newer `init()` supersedes any slower in-flight attempt.
