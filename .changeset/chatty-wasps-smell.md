---
'@c15t/core': major
'@c15t/schema': major
'@c15t/react': major
'@c15t/nextjs': major
'@c15t/ui': patch
'@c15t/vue': major
'@c15t/svelte': major
'@c15t/astro': patch
'@c15t/translations': minor
---

Make policy presentation consistent across banners and preference dialogs.

- Use `blocking` to control backdrop, focus trapping and scroll locking together. Explicit values override deprecated `scrollLock` and `trapFocus` options. Choice banners default to non-blocking; choice walls block; notice walls fall back to non-blocking floating cards.
- Restrict `variant` and `position` to prompts. Preference dialogs remain centered and honor `blocking: false`.
- Replace `uncoveredRights` with `preferenceControls`, a recommendation for additional buttons that open preferences. It does not verify disclosure or implementation of policy rights. Opt-out controls remain buttons styled as underlined text.
- Label notice dismissal "OK" through `common.acknowledge`, falling back to `common.dismiss` in older bundles. Acknowledgement preserves existing choices and permissions.
- Keep the full widget and bar descriptions and inline legal links visible.
- Require explicit `scopeMode: 'strict'` or `'permissive'` when a policy selects only some optional categories. Existing resolved policies and receipt fingerprints remain readable.
