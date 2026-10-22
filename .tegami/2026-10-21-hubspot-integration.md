---
packages:
  '@c15t/core': patch
  '@c15t/integrations': minor
  '@c15t/cli': patch
  '@c15t/scripts': patch
---

### Add HubSpot consent integration

Load HubSpot after marketing consent with the `hubspot` helper, with vendor metadata, framework registration examples and CLI setup.

Request HubSpot cookie revocation when any forwarded grant is withdrawn, then restore remaining consent categories. Validate the region only when the default loader URL is used.

Warn when a non-script element with `id="hs-script-loader"` blocks loading, with instructions to remove or rename the conflicting ID.

Share one HubSpot controller across compatible helper configurations and their loader registrations. Intersect each owner's loader gate, vendor permission and consent fields, including initially denied owners. Ordinary nonfinal departure preserves permitted consent, chat and the late-completion guard without revocation or another widget load. Reattach the guard on permitted remounts, including with a retained SDK client.

Read current core permission before releasing a script registration, so real category and vendor withdrawals still take effect during reentrant updates or replacement. Preserve saved grants across final teardown and replacement instead of revoking cookies solely because a provider unmounts. Detach callbacks and listeners without starting new chat work during departure.

Leave chat manual unless an active owner opts in. Any `chat: true` owner requests automatic chat under every owner's actual consent restrictions; `chat: false` alone does not deny it. Stop automatic chat management when the last opt-in leaves, without removing a widget that the remaining consent permits. Retain pending widget loads through removal and remounts to avoid duplicate loads.

Recheck current shared permissions and chat opt-in before deferred SDK-ready cleanup. Skip stale removal and chat-cookie cleanup after permission returns, including across remounts and replacements. Keep cleanup for withdrawals that still deny automatic chat at readiness.

Reconcile current chat permission when automatic management attaches to a Conversations client, including an already-loaded external client, late SDK readiness, client replacement and a manual-to-automatic handoff. Request widget removal and chat-cookie cleanup while shared permission denies chat, without waiting for another load event. Skip cleanup on permitted attachment and keep fresh loader- or vendor-denied controllers inactive.

Reserve the first configuration's portal, effective loader URL and nonce until reload. Warn and ignore incompatible configurations instead of sending grants to the wrong account. Reuse compatible external loaders with a warning and block control of incompatible external installations.
