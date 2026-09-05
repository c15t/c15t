---
'@c15t/dev-tools': patch
'@c15t/core': patch
'@c15t/svelte': patch
---

Keep DevTools selections in an unsaved draft until confirmation. Replace `actions.setConsent` with `actions.setDraft`, discard stale edits with `actions.resetDraft`, use `actions.dismissNotice` for local notice dismissal, and supply `clearRecords` from the existing persistence handle to expose record clearing. Supply `getPresentation` to inspect host presentation options; omitted options are labeled as resolved defaults.

Allow bulk saves to narrow confirmation to displayed current-policy categories with the optional `categories` save context, preserving hidden choices, privacy restrictions, and existing save metadata.

Framework adapters read displayed categories and presentation from their provider and clear records through its existing persistence instance. Dirty drafts retain their policy fingerprint and require review after a policy change; successful saves preserve edits made while delivery was pending.

Keep Svelte preferences open while a save is pending or fails. Successful saves preserve later edits, respect newer dialog actions, and return to any required notice.
