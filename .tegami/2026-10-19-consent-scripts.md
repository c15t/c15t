---
packages:
  "@c15t/backend": minor
  "@c15t/core": minor
  "@c15t/schema": minor
---

### Record which configured scripts each consent allowed

A consent save now lists the scripts the page registered with the script
loader, whether or not the choice let them load. Each entry carries only the
fields that decide whether a script may run: its id, category condition,
vendor, IAB TCF vendor ID, purposes and special features, and the
`alwaysLoad`, `callbackOnly` and `persistAfterConsentRevoked` flags. No source
URL or inline code leaves the page. An entry the backend would refuse is left
out rather than sent.

The backend stores the list in a new nullable `consent.scripts` column and
adds `allowed` to each entry: whether the consent permitted that script to
load, worked out with the browser's script-loader rules from the resolved
policy, the submitted preferences, vendor grants and Global Privacy Control.
It means permitted, not executed. Under an `iab` policy, scripts with IAB TCF
fields have no `allowed`, because their gate reads the TC string. Neither do
entries whose answer depends on an earlier category value the save did not
confirm, since the backend can't tell whether that value has lapsed. Run
migration `10-consent-scripts` before deploying. A retried save with a
different list keeps the first one and is not a conflict. Network blocker
rules and iframes are not listed, and `GET /subjects/:id` does not return
the list.

`@c15t/schema` exports `satisfiesCategoryCondition`, which evaluates a
category condition such as `{ and: ['measurement', 'marketing'] }` against a
set of permissions.
