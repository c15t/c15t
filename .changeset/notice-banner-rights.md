---
'c15t': minor
'@c15t/react': minor
'@c15t/nextjs': minor
'@c15t/translations': minor
'@c15t/schema': minor
'@c15t/ui': minor
'@c15t/vue': minor
'@c15t/svelte': minor
'@c15t/astro': minor
---

Notice banners now keep the rights a policy guarantees reachable. Under an
opt-out rule with `prompt: 'notice'`, the banner renders an underlined "Do
not sell or share my data" text link that opens the preference center, and a
primary "Accept All" button, in one action row. The link keeps the emphasis on
the button. Before, a notice showed a bare,
untranslated "Dismiss" button and nothing else.

"Accept All" on a notice records a dismissal, not a choice. The label is
truthful because a notice only exists under the opt-out model, where every
category is already permitted. `common.dismiss` ("Dismiss") stays available,
and the React `dismissButtonText` prop overrides the label.

The core resolver returns `uncoveredRights` next to the resolved actions: the
rights no action on the surface covers. `disclosure` never appears because
inline legal links carry it, `preferences` is covered by customize or save,
and `opt-out` is covered by reject. An uncovered opt-out control opens the
preference center, so it also satisfies the preferences right and a notice
shows a single link. Right links also appear on a choice prompt when nothing
covers them, so a rule with only accept and reject renders a "Manage
preferences" link.

Translations gain `common.dismiss`, `rights.optOut`, `rights.preferences`,
`cookieBanner.noticeTitle`, and `cookieBanner.noticeDescription` in every
bundled language, and the wire schema carries them so hosted `/init` responses
round-trip. A notice reads the notice title and description by default.

React adds `ConsentBanner.DismissButton`, `ConsentBanner.Rights`,
`ConsentBanner.RightLink`, a `dismissButtonText` prop, `useBannerCopy()`, and
`banner.uncoveredRights` on `useHeadlessConsentUI`. `PolicyActions` renders
the rights automatically. Right links carry `data-action="right"` and
`data-right`; `RightLink` accepts `asChild` for hosts that want an anchor to a
dedicated opt-out page. Themes may set `consentActions.dismiss`, and the
`primary` and `customize` keys are honored. The banner root emits `data-prompt`
and `data-model`, and the Next.js server shell renders the same markup with
`classNames.rights` and `classNames.rightLink`.

`@c15t/ui` adds the `consentBannerRights` and `consentBannerRightLink` slots
and the `rights`/`rightLink` class exports, keyed to `data-prompt='notice'`
for the notice layout. Vue exposes `uncoveredRights` from
`useConsentPolicyActions` and a `leading` slot on the actions component.
Svelte adds `dismissButtonText` and a `leading` snippet on the policy actions
renderer. Astro renders the same rights and dismiss markup on the server.
