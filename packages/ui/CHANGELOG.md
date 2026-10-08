## @c15t/ui@3.0.0-alpha.7 (alpha)

### Show the consent banner at once, and fade it in only when it arrives late

The banner and the IAB banner no longer slide or scale in on a spring curve.
A banner that shows with the page is part of the first paint, where the
overshoot read as layout shift, so it now appears on its first frame. The
backdrop of a blocking banner appears with it.

A banner that arrives more than 100ms after the page first painted, such as
after a slow script or a client-side init, fades in instead of popping into a
page someone is already reading. It fades over `--c15t-duration-normal` on
`--c15t-easing-out` and never moves. Its root and backdrop carry
`data-entry="late"`, and `--consent-banner-entry-duration` and
`--consent-banner-entry-timing` (`--iab-consent-banner-entry-*` for the IAB
banner) set the fade. A banner rendered on the server always shows at once.
`@c15t/ui/utils/late-entry` exports the check as `isLateEntry`.

Hiding still fades the banner out where it did before, now without the slide
or scale, and on an ease-in curve so it speeds up as it leaves.
`disableAnimation` turns both fades off.

Add the `--c15t-easing-in` theme token, set with `motion.easingIn`. It defaults
to `cubic-bezier(0.55, 0.055, 0.675, 0.19)` and sets the banner's exit curve.

## @c15t/ui@3.0.0-alpha.6 (alpha)

### Build Next.js Pages Router apps without `transpilePackages`

A Next.js app with only a `pages/` directory builds with c15t's stock dialog.
Before, webpack builds failed with "Global CSS cannot be imported from within
node_modules" unless the app set `transpilePackages`, and Turbopack failed on
linked installs.

`styles.css` includes the preference dialog and widget rules again, and no
`@c15t/react` or `@c15t/ui` module imports CSS. The render-blocking stylesheet
grows by about 4.5 kB gzip.

`@c15t/ui/styles/dialog.css`, the `@c15t/ui/styles/dialog` module and
`c15t/astro/dialog.css` are now empty. They still resolve, so existing imports
keep building. Remove them.

### Open DevTools from the consent trigger toolbar

With `<ConsentDevTools>` mounted next to a visible `ConsentDialogTriggerToolbar`
or `ConsentDialogTrigger`, the trigger shows a DevTools button and DevTools
hides its floating launcher, so the two no longer overlap.
`ConsentDialogTrigger` becomes a two-button toolbar. The panel opens beside the
toolbar and follows it when dragged. DevTools restores its own launcher when no
trigger is visible.

For hosts that render their own launcher, DevTools instances gain
`dock(placement | null)` and `DevToolsState` reports the current `dock`.

### Switches follow the theme's primary color

The active switch track defaults to the primary color, in the light and dark
palettes and in a stylesheet that sets `--c15t-primary` directly. Before, a
theme that set `colors.primary` without `colors.switchTrackActive` kept the
switches blue. Set `colors.switchTrackActive` or `--c15t-switch-track-active`
for a different color. The default theme looks the same.

## @c15t/ui@3.0.0-alpha.5 (alpha)

### React provider on the shared runtime

`@c15t/react`'s `ConsentProvider` now renders the runtime from
`createConsentProviderRuntime`, the same one the Svelte provider uses, instead
of its own copy. Its props, hooks and the `runtime` prop are unchanged.
`ConsentRoot` in `@c15t/nextjs` and `@c15t/tanstack-start` picks this up.

**Breaking.** `persistence` and `storageConfig` are read once, when the
provider mounts. A new storage key used to move the stored choice to the new
key; now the choice stays where it was, data clearing keeps protecting that
key, and a warning is logged outside production. The same applies to every
provider runtime, including Svelte's. Migration: remount the provider to move
storage.

Behaviour that changes:

- A `prefetch` that is still marked `initialPolicyPending` is no longer
  adopted as the answer: the provider sends `/init`.
- Adopting a server-resolved `prefetch` raises `init:applied`, as an `/init`
  response does.
- A streamed `prefetch` that carries an experiment but arrives after mount
  keeps `experiment` in the `/init` request the provider falls back to.
- A provider rendered under a `consentSource` raises `init:applied` once the
  source is connected.
- After mount, a new `user`, `vendors`, `scripts` or blocker options apply
  once a small chunk has loaded, the first time options change. `enabled`,
  `overrides` and `consentCategories` still apply at once, and requests that
  new network rules match are held until the blocker has them.

`ConsentProvider` loads the code that applies a `prefetch` promise only when it
gets one, so an app that never streams consent state doesn't download it.
`ConsentRoot` in `@c15t/nextjs` and `@c15t/tanstack-start`, whose `state` is
usually streamed, ships that code in its first-load chunk, so a streamed state
applies as soon as it arrives instead of after one more request.

`@c15t/react`'s index now re-exports its values in groups with `export *`.
The names are the same. Under esbuild's code splitting, an app that imports
only `ConsentProvider` or a hook no longer loads the dialog trigger, branding
and draft modules on first load, because the deferred dialog no longer pulls
every module the index names into the first chunk.

`@c15t/ui`'s `setupColorScheme` moves to its own module,
`@c15t/ui/utils/color-scheme`. A provider that sets the color scheme no longer
shares a chunk with the dialog's focus-trap and scroll-lock helpers.
`@c15t/astro` imports it from the new path.

**Breaking.** `@c15t/ui/utils/dom` no longer exports `setupColorScheme`.
Migration: import it from `@c15t/ui/utils/color-scheme` or `@c15t/ui/utils`.
The old path is not kept as a re-export: Vite 8 (Rolldown) counts unused
imports when it checks a build's chunks for cycles, and in TanStack Start that
re-export closed one, so each module a lazy chunk shared with the route became
its own first-load file.

### Provider runtime

- `c15t/runtime/provider` (`@c15t/core/runtime/provider`) exports what a
  provider that loads modules on demand needs: `createConsentProviderRuntime`,
  `lazyRuntimeModule` and `lazyStreamPrefetch`, which loads the
  streamed-prefetch code only for a runtime whose `prefetch` is a promise.
  Importing `c15t/runtime` instead can keep the statically imported default
  modules in the first chunk under esbuild.
- `update()` returns a promise that settles once every change has applied.
  The comparison behind it loads with the first `update()`.
- A `consentSource` connects through a new `connectConsentSource` module
  (part of `defaultRuntimeModules`). The React provider imports it on demand;
  until it connects, no optional category is granted.
- IAB mounts through a new `mountIAB` module (`mountRuntimeIAB`, part of
  `defaultRuntimeModules`). A provider that passes its own modules without it
  ignores `iab`.
- With a script loader that loads on demand, data clearing now subscribes after
  the loader has loaded, so revocation callbacks run before browser data is
  removed.
- `persistence.now` is passed through to persistence; the runtime used to drop
  it.

## @c15t/ui@3.0.0-alpha.4 (alpha)

### Update documentation links

Point documentation links in CLI prompts and errors, runtime warnings, TSDoc, package READMEs and package homepages at the current c15t.com docs pages. The old addresses led to pages that were moved or removed.

### Apply `theme.slots` in React and Vue

`theme.slots` now styles the stock parts in React and Vue, as it already did in Svelte, Astro and the script tag. Each slot maps onto the matching `components` part (`consentDialogCard` onto `dialog.card`, `toggle` onto `switch.root`), and `components` wins where both set the same attribute. A slot with `noStyle: true` drops that part's stock classes and keeps the slot's and the part's own classes, as in the other adapters; a slot that sets only `noStyle` applies too. React used to accept `theme.slots` in its types and ignore it.

The `frame` and `consentDialogFooter` slot keys are removed: no adapter read them. Style the stock dialog's footer with `consentWidgetFooter`, and the `ConsentGate` placeholder with the new `consentGate` slots.

In Vue, the assigned experiment arm's `theme.slots` merge over the host theme's, as they already did in React, so an arm that changes only a slot renders its classes and styles.

A numeric length in a slot style, such as `{ padding: 8 }`, now renders as `8px` in Vue too. Vue writes style objects as given, so the number used to be dropped.

### Lay out banner actions by card width

The banner footer now switches layout on the card's width instead of the viewport's, so `--consent-banner-max-width` works on wide screens. A card narrower than 22rem puts Reject and Accept on one row and Customize on a full-width row below, where the buttons used to overflow the card. The default 440px card keeps its single row.

The `widget` chip is 20rem wide by default, so it now uses the same two-row footer on every screen size.

### Start the banner's entry from the stylesheet, and keep the collator off the init path

Canonical sets and fingerprint keys were sorted with
`String.prototype.localeCompare`, whose first call initialises the ICU
collator on the main thread before the banner can show. They now use a
comparator that applies the same root-collation order to printable ASCII
directly and only falls back to the collator for other strings, so every
fingerprint stays byte-identical.

Every framework also started the banner's entry transition its own way: the
script tag and Svelte inserted the hidden state, forced a layout and flipped
the class; React rendered hidden and flipped after a timer; Vue handed the
flip to `Transition`; Astro's prerendered banner did not animate at all.
`@c15t/ui` now carries the entry as `@starting-style` states, the
`bannerEntering`, `overlayEntering`, `dialogEntering` and `contentEntering`
classes, and each framework renders the banner in its visible state with the
entering class. The transition runs from the first frame with no hidden
render or layout read, and it runs the same way whether the banner arrives
from the server or the client. Astro's prerendered banner now fades in at
first paint like the others. Browsers without `@starting-style` show the
banner in place; the script tag keeps its class flip for them.

### Unwrap every c15t stylesheet for Tailwind 3

`@c15t/ui/postcss-tailwind3` now unwraps the `@layer` blocks of every built stylesheet a c15t package publishes, not only those of `@c15t/ui` and `@c15t/browser`. Two setups failed before:

- `@import '@c15t/svelte/styles.css'` in an app stylesheet. Tailwind 3 treated c15t's rules as part of its own components layer and purged them, leaving the Svelte and SvelteKit banner unstyled.
- `@c15t/astro/styles.css`, which Astro injects on every page. The Astro build failed with "`@layer components` is used but no matching `@tailwind components` directive is present".

The plugin also recognizes c15t stylesheets whose path carries a query, such as the `?transform-only` Astro adds to the dialog stylesheet.

A stylesheet under `packages/<name>/dist/` of a workspace only counts as c15t's when that package's `package.json` is named `c15t` or `@c15t/*`. Before, any `packages/ui/dist` or `packages/browser/dist` stylesheet matched, so another monorepo's own packages could lose their `@layer` blocks.

### Keep the Astro color scheme when a dialog opens

With `colorScheme: 'dark'` or `'system'`, opening the preference dialog with `ui: 'react'` removed `c15t-dark` from `<html>` unless the page also had a `dark` class, so the banner and dialog turned light. The dialog islands now leave the class to the page's colour-scheme setting. The provider option types in `@c15t/react` and `@c15t/ui` now accept `colorScheme: null`, which the providers already treated as "leave the class alone".

Set `colorScheme: 'none'` when your site's own theme switch sets `c15t-dark`. c15t then emits no colour-scheme script and never adds or removes the class, on boot, after ClientRouter navigations or when a dialog opens.

### Use the theme's motion tokens on the floating trigger

The floating dialog trigger now times its hover and snap transitions with `--c15t-duration-slow`, `--c15t-easing-out` and `--c15t-easing-in-out`. It read variables no theme sets, so `theme.motion` never reached it.

### Keep c15t styles above Tailwind v4 preflight

The layered stylesheets (`styles.css`, `styles/dialog.css`, `styles/primitives.css` and `iab/styles.css`) and `@c15t/astro/styles.css` now open with Tailwind v4's layer order, `@layer properties, theme, base, components, utilities;`. Cascade layers rank by the order they are first named, so a page that loaded c15t's stylesheet before Tailwind's put `components` below Tailwind's `base`, and preflight removed the banner's padding and borders. This happened on Astro sites using Tailwind v4, where the integration injects c15t's stylesheet first, and in apps that import c15t's stylesheet above their own. The order now holds whichever sheet loads first.

Without Tailwind the extra layers stay empty. If your CSS declares its own layer order, load that statement before c15t's stylesheet. The `.tw3.css` files are unchanged, and `@c15t/ui/postcss-tailwind3` removes the statement for Tailwind 3.

### Rename the remaining `frame` names to `consentGate`

**Breaking.** `ConsentGate` was called `Frame`, and several names still said so. They now say `consentGate`:

- The translations section `frame` is now `consentGate` (`consentGate.title`, `consentGate.actionButton`, `consentGate.policyBlocked`, `consentGate.loading` and `consentGate.error`) in every bundled language, in `CompleteTranslations` and `Translations`, in the `/init` response schema, in `@c15t/backend` responses and in the React Native translation types. `FrameTranslations` is now `ConsentGateTranslations`, and the old name stays as a deprecated alias.
- The stylesheet `@c15t/ui/styles/components/frame` is now `@c15t/ui/styles/components/consent-gate`, and its custom properties are `--consent-gate-*` instead of `--frame-*`.
- The placeholder's test ids are `consent-gate-placeholder` and `consent-gate-button` instead of `frame-placeholder` and `frame-open-dialog`. Its title now has `consent-gate-title`.

Copy under the old key still works. When custom translations, `i18n.messages`, stored copy or an older backend's `/init` response has `frame`, c15t reads it as `consentGate`, with `consentGate` winning key by key when both are set, and logs a warning once outside production. `@c15t/translations` exports the conversion as `migrateLegacyTranslationKeys`. The `frame` stylesheet subpaths stay as deprecated aliases of `consent-gate` for this alpha.

`theme.slots` has a `consentGate` family for the placeholder: `consentGate` for the card, `consentGateTitle` and `consentGateButton`. React, Next.js, TanStack Start, Vue and Svelte apply them. React and Vue also take the same parts as `components['consent-gate'].root`, `.title` and `.button`, and `components` wins where both set an attribute. `consentGateButton` applies on top of `buttonPrimary`.

### Accept `disableAnimation` on the Svelte dialogs

`ConsentDialog` and `IABConsentDialog` take a `disableAnimation` prop that overrides the provider's `disableAnimation` for that dialog, as `ConsentBanner` and the React dialogs already do.

The IAB dialog's backdrop now fades in when the dialog opens, like the consent dialog's and the banners'. It used to appear at full opacity at once. `disableAnimation` on the dialog or the provider turns the fade off, and so does a reduced-motion preference.

### Apply `generateThemeCSS` output wherever it lands in the page

A theme rendered with `generateThemeCSS` used the same selectors as the
default tokens in `styles.css`, so whichever came later in the document won.
SvelteKit writes `<svelte:head>` content before its stylesheet links, so a
theme rendered there, as the SvelteKit guide shows, was replaced by the
defaults. The generated selectors now carry one more specificity point
(`:root:root`, `.c15t-theme-root.c15t-theme-root`), so in the document the
theme overrides the defaults before or after the stylesheet. Inside a shadow
root, `:host` keeps the defaults' specificity, so the theme still has to come
after the stylesheet there; the script tag's mount already writes it last.
This covers `ConsentTheme` in
React, Next.js and TanStack Start, Astro's server-rendered theme and the
script tag's `theme` option too.

Your own CSS that sets `--c15t-*` variables on plain `:root` next to a
generated theme now loses to the theme. Put those values in the theme, or
raise the selector to `:root:root`.

### Add CSS variables for the "Secured by" tag

Restyle the branding tag on the banner and dialog with `--consent-branding-tag-background-color`, `--consent-branding-tag-border-color`, `--consent-branding-tag-text-color`, `--consent-branding-tag-mark-color` and `--consent-branding-tag-shadow`. `--consent-branding-tag-attached-edge-width` draws a border on the edge where the tag meets the card, which has none by default.

Without these variables set, the tag looks the same as before.

### Open the preference dialog with focus on its first control

The consent dialog and the IAB dialog used to focus their own container on
open and draw a focus ring around the whole card for keyboard users. They now
focus the first tabbable control inside the panel, the way dialog libraries
such as Base UI do, so the ring lands on a control. Screen readers still
announce the title and description as focus enters, through the panel's
`aria-labelledby` and `aria-describedby`. Blocking banners keep focusing
their container so no action button is favored. `setupFocusTrap` in
`@c15t/ui` takes an `initialFocus` option, and the React hook, Svelte action
and Vue composable pass it through.

### Fix IAB feature styling, accessibility, and Astro script escaping

Apply theme spacing and typography to the IAB feature section. Hide decorative
feature disclosure arrows from screen readers in Vue. Escape Astro client module
paths and adapter names when generating page scripts.

### Remove unused banner card animation rules

The banner and IAB banner stylesheets no longer carry `.card[data-state]` animation rules or the `--consent-banner-entry-animation`, `--consent-banner-exit-animation`, `--iab-consent-banner-entry-animation` and `--iab-consent-banner-exit-animation` variables that fed them. No banner ever set `data-state` on its card, so the rules never applied. The banners animate through their visible, hidden and entering classes as before. The `iab-consent-banner.css` animations export keeps its keyframes.

`setupColorScheme()` no longer throws where `matchMedia` is missing, as in some embedded webviews. `'system'` is light there. The motion token TSDoc now gives the real duration defaults: 80ms, 150ms and 200ms.

### Let the theme reach legal links, the ConsentGate placeholder and IAB highlights

Several parts of the UI used fixed values instead of theme tokens, so a custom `theme` left them on c15t's defaults. They now follow the theme:

- Legal links use `colors.primary`. In dark mode they use the dark primary, which is lighter than the previous fixed blue.
- The ConsentGate placeholder takes its font, colors, radius and shadow from the theme.
- The IAB dialog's selected-vendor banner and search focus ring are tints of `colors.primary` instead of a fixed blue.
- A disabled switch's outline uses `colors.border`, so it no longer shows a light ring in dark mode.
- The preference accordion and vendor list focus rings use `colors.primary`, with the same dark-mode fix as legal links. Their arrows and category descriptions are shades of `colors.textMuted`, matching the old greys with the default theme.
- The dialog and banner entrance springs, accordion and collapsible fades, tab transitions and the placeholder fade-in use the `motion` easings and durations.
- The IAB dialog title and banner title use `typography.fontSize.lg`, and the dialog footer and legal links use `fontSize.sm`.

With the default theme, the light-mode changes are small shifts in shade and easing.

### Keep Vue components styled next to Tailwind 4

Vue components import their stylesheets one component at a time, and Vite links those stylesheets ahead of the app's CSS when they share a chunk. The first of them declared `@layer components` before Tailwind 4 declared `base`, so Tailwind's preflight removed the banner's padding, borders and button backgrounds. Each `@c15t/ui/styles/components/*.css` file now opens with Tailwind 4's layer order, `@layer properties, theme, base, components, utilities;`, as the aggregate stylesheets already did.

The dialog trigger stylesheet now keeps its rules in `@layer components` as well, so a Tailwind utility passed to the Vue trigger overrides it the same way it does in React.

### Support IAB TCF 2.4

c15t now follows TCF 2.4 and TCF Policies v5.0.b. Existing TC strings stay valid.

- The IAB preference centre shows Features in their own section with the IAB standard text and no controls. Special Purposes stay locked.
- `__tcfapi` TC data includes `vendor.disclosedVendors`.
- `isServiceSpecific` is deprecated. TC strings always set IsServiceSpecific=1.
- Vendors that declare only Special Purposes no longer get a legitimate interest bit.
- GVL schemas keep unknown fields, so `standardTexts` survives the backend cache.

### Migration

Headless IAB UIs: `resolveIABDialogDisplayModel` now returns Features in `featureRows` instead of `essentialRows`. Render them without a control, under `featuresStandardText` or your `features.description` translation when it is `null`.

### Use the theme font in the preference list

The preference list in the consent dialog and consent widget now uses `typography.fontFamily` from your theme, like the dialog's title and buttons. It used a fixed system font stack before, so a themed dialog showed its category rows in a different font.

### Keep fixed elements still when a consent dialog locks scrolling

A blocking banner or dialog no longer shifts the page sideways on systems that show classic scrollbars, such as Windows, Linux and macOS with "Always show scrollbars" enabled. The scroll lock used to pad `<body>` by the scrollbar width, which kept in-flow content in place but still widened the viewport, so fixed headers, right-aligned controls and side panels jumped by the scrollbar width. It now sets `scrollbar-gutter: stable` on `<html>` while the page is locked, so the viewport keeps its width. Pages without a visible scrollbar get no gutter, and a `stable` gutter the page already sets is left alone. Browsers without `scrollbar-gutter` support still get the `<body>` padding.

The lock now also works on pages that set `overflow` on `<html>`, where hiding `<body>` overflow alone did not stop the page scrolling, and it restores inline `overflow-x` or `overflow-y` values it replaced instead of clearing them.

### Use `styles.css` with Tailwind 3

Tailwind 3 apps now import the same stylesheet as every other setup, such as `c15t/react/styles.css` or `c15t/next/styles.css`, and run `@c15t/ui/postcss-tailwind3` before `tailwindcss`. The plugin previously skipped the entry stylesheets, so Tailwind 3 apps had to pick `styles.tw3.css`, and the dialog stylesheet still needed the plugin. It now also flattens `styles.css` and `iab/styles.css`, handles c15t rules that Vite or `postcss-import` inline into your own stylesheet, and covers `@c15t/browser/styles.css` for light-DOM setups, where Tailwind 3 previously dropped the rules without an error and its preflight stripped the banner's button padding and borders.

```js title="postcss.config.mjs"
export default {
	plugins: {
		'@c15t/ui/postcss-tailwind3': {},
		tailwindcss: {},
		autoprefixer: {},
	},
};
```

Use the object form: Vite's PostCSS config loader rejects plugin names in an array.

Import the stylesheet above your `@tailwind` directives. `postcss-import` ignores an `@import` that follows other rules, so the previously documented position between `@tailwind components` and `@tailwind utilities` dropped the c15t rules in Vite apps. When the plugin is missing, Tailwind 3's build error now shows a comment naming it.

`c15t setup` now imports `styles.css` for Tailwind 3 and adds the plugin to your PostCSS config, replacing an existing `styles.tw3.css` import. Before this, it imported `styles.tw3.css` without the plugin, and the build failed on the dialog stylesheet. Setup also installs `@c15t/ui`, so pnpm can resolve the plugin. It edits the active plugin list, including `[name, options]` tuples, and ignores commented-out examples. If the config passes an imported `tailwindcss` binding, lists the c15t plugin after `tailwindcss`, or has no single plugin list to edit, if `package.json` holds the PostCSS config, or if several config files exist, setup prints the change to make instead of guessing which one your build reads. The v1 to v2 `add-stylesheet-imports` codemod keeps importing `styles.tw3.css`, because the plugin does not exist in v2.

`styles.tw3.css` and `iab/styles.tw3.css` still ship and work with the plugin.

### Keep checked switches inside their track in right-to-left languages

In Arabic, Hebrew and other right-to-left copy, a checked switch in the preference dialog now moves its thumb to the left end of the track. The rule only matched a `dir` attribute on the switch itself, which no adapter sets, so the thumb slid past the track's edge.

### Stop banner and dialog motion under reduced motion in every adapter

The `prefers-reduced-motion: reduce` rules now use the same selectors as the rules that animate each part, so they win wherever an adapter puts the class. They were one class lighter for the banner and dialog, so Vue, Nuxt and Astro banners still slid in for visitors who asked for less motion. The fix also covers the sidebar dialog, secondary and dark button hovers, tab triggers, the accordion row and the IAB tab indicator.

### Add trigger slots and keep slot classes under `noStyle`

`theme.slots` gains `consentDialogTrigger` and `consentDialogTriggerIcon` for the floating button that reopens the preference center and its icon, the parts React and Vue style with `components.trigger.root` and `components.trigger.icon`. The Svelte `ConsentDialogTrigger` applies both, including a slot's `style`.

`resolveStyles` now keeps theme slot classes and styles under `noStyle` and drops only the stock classes. Before, a component that passed its own `noStyle` flag lost the theme slot's classes, and one that passed a `baseClassName` kept the stock class. In `@c15t/svelte`, the banner, dialog and widget parts now keep their `theme.slots` classes when `noStyle` is set, and the widget's footer button group reads `consentWidgetFooterSubGroup` instead of `consentWidgetFooter`.

### Stop the floating trigger's transitions when `disableAnimation` is set

The floating dialog trigger and the trigger toolbar now carry `data-disable-animation` when the provider's `disableAnimation` is on, and the stylesheet then drops their hover and snap-to-corner transitions. They already stop under `prefers-reduced-motion: reduce`.

## @c15t/ui@3.0.0-alpha.3 (alpha)

### Render theme CSS on the server

**Breaking.** The browser no longer generates theme CSS. `ConsentProvider` (and `ConsentRoot`) used to turn `options.theme` tokens into a `<style id="c15t-theme">` element on every page, so every visitor downloaded the theme generator and the default theme, about 1.7 KB gzip. The package stylesheet already carries the default tokens, so the provider now renders no theme style at all.

Render custom tokens with the new `ConsentTheme` component, exported from `@c15t/react`, `@c15t/nextjs`, `@c15t/tanstack-start` and the `c15t/react`, `c15t/next` and `c15t/tanstack-start` entries. It is not a client component: render it from a Server Component and the generator stays on the server. `ConsentTheme` takes `theme`, `colorScheme` (`'light'`, `'dark'` or `'system'`, applied before hydration) and `nonce`. `generateThemeCSS()` from `@c15t/ui/theme` now escapes `<`, so its output is safe inside a `<style>` element wherever you render it.

`@c15t/svelte`'s provider no longer injects the token CSS after hydration, which also removes the one-frame flash of default colors in SvelteKit. `@c15t/astro` now renders the integration's `theme` tokens on the server, next to the config script, instead of leaving them to the dialog islands.

### Migration

- **Next.js App Router.** Move the theme to a module without `'use client'`. Render `<ConsentTheme theme={theme} />` in the root layout (a Server Component) next to your consent wrapper, and pass `colorScheme` and `nonce` there if you set them on `ConsentRoot`. Keep `options.theme` on `ConsentRoot` only for `consentActions` and slot styles.
- **Next.js Pages Router.** Render `ConsentTheme` in `pages/_document.tsx`.
- **TanStack Start.** Return `generateThemeCSS(theme)` from a `createServerFn` handler in the root loader and render it in a `<style id="c15t-theme">` in the head. Rendering `ConsentTheme` in the root component also works but ships the generator.
- **React without server rendering.** Render `ConsentTheme` next to the provider (this ships the generator), or put the output of `generateThemeCSS(theme)` in your stylesheet.
- **SvelteKit.** Return `generateThemeCSS(theme)` from `+layout.server.ts` and render it inside `<svelte:head>`. Keep slot styles and `consentActions` in `options.theme`.
- **Astro.** Keep tokens in the integration's `theme`. Tokens in the client entrypoint's `theme` are no longer applied.
- **Light and dark at runtime.** Render `ConsentTheme` without `colorScheme` and toggle the `dark` class on `<html>` (for example with next-themes): its output holds both schemes. The provider's `colorScheme` option still keeps the `c15t-dark` class in sync after hydration.
- **Switching token sets at runtime.** Render `ConsentTheme` from a client component and change its props.
- Keep importing the package stylesheet. It holds the default tokens the provider used to inject.

In development, the provider warns when `theme` holds tokens but the page has no `c15t-theme` stylesheet.

### Keep dialog CSS out of the render-blocking stylesheet

**Breaking.** `styles.css` now carries only what a first paint can show: the default tokens, every c15t CSS variable, and the rules for the banner, `ConsentDialogTrigger` and the `ConsentGate` placeholder. It shrinks from 125 KB to 66 KB (16.2 KB to 8.8 KB gzipped). The dialog and preference-widget rules moved to `@c15t/ui/styles/dialog.css`, which the dialog's module imports, so your bundler ships them with the dialog's lazy chunk and applies them before the dialog renders. In a Next.js production build the page's stylesheet drops from 18.2 KB to 10.6 KB gzipped.

- `@c15t/ui/styles.css` and `styles.tw3.css` no longer contain the dialog, preference widget, accordion, switch, tabs, collapsible, preference item or vendor list rules. React, Next.js and TanStack Start load them for you. If you render `@c15t/ui` class maps for those parts in your own components, import `@c15t/ui/styles/dialog.css`.
- `@c15t/react/primitives` and every `@c15t/react/primitives/*` entry load the dialog stylesheet, because the accordion, collapsible, preference item, switch and tabs rules moved there.
- JavaScript loads the dialog rules through the new `@c15t/ui/styles/dialog` module. Bundlers follow its import of `styles/dialog.css`; under the `node` export condition it imports nothing, so plain Node (the Pages Router, or SSR that keeps dependencies external) can load every `@c15t/react` entry. Import it instead of the `.css` file from components that can run on the server.
- The rules for the `@c15t/ui/styles/primitives` class maps moved to `@c15t/ui/styles/primitives.css`. The React components never used them. `c15t/svelte/styles.css` imports them; other hosts that render those class maps import the file themselves.
- `iab/styles.css` no longer repeats the default tokens and the shared rules. Import it after `styles.css`, as the IAB guides already say.
- Tailwind 3: the dialog stylesheet goes through your PostCSS pipeline, and Tailwind 3 rejects its `@layer components` block. Add `@c15t/ui/postcss-tailwind3` before `tailwindcss` in your PostCSS plugins. Without it the build fails with "`@layer components` is used but no matching `@tailwind components` directive is present".
- If you import `styles.css` into a named layer (`@import '…/styles.css' layer(c15t)`), the dialog rules still join the top-level `components` layer.

Svelte, Astro, Vue and the script-tag build render the same styles as before. `c15t/svelte/styles.css` still holds every rule, because Svelte loads its dialog with the page. Astro injects the banner rules; the React and Svelte dialog islands import the rest, which Astro links on every page, and with `ui: 'vue'` the integration injects them. If you set `styles: false` with `ui: 'vue'`, also import `@c15t/ui/styles/dialog.css`. `@c15t/browser` inlines the dialog rules as before.

### Load each component stylesheet rule once

Apps that import `styles.css` no longer download component rules a second time. The `@c15t/ui/styles/components/<name>` class maps used to import their own CSS, so bundlers such as Next.js with Turbopack emitted extra stylesheets for the banner, actions, legal links and consent gate on first load, and for the dialog when it opened, all duplicating rules already in `styles.css`. Class maps now carry no CSS, and `styles.css` stays the single source for React, Next.js, TanStack Start, Svelte and Astro.

Vue components still include their styles: they now import the matching `@c15t/ui/styles/components/<name>.css` files directly, and Vue apps emit the same CSS as before.

If you imported `@c15t/ui/styles/components/<name>` class maps in your own components and relied on them to load CSS, import `styles.css` once, or import the matching `<name>.css` file.

## @c15t/ui@3.0.0-alpha.2 (alpha)

### Fix declaration imports for Node16 and NodeNext

Fix declaration imports for TypeScript consumers using Node16 or NodeNext resolution. Preserve explicit JavaScript filenames so exported APIs retain their types without requiring `skipLibCheck`.

### Granular consent

Grant a category and still turn one vendor off, outside IAB TCF. Declare vendors with the `vendors` option or the backend manifest, then name them with `vendor` on scripts and network rules and `data-vendor` on iframes. A target loads when its category passes and its vendor is not off; `alwaysLoad` scripts see the result in their callbacks.

The preference centers in React, Next.js, TanStack Start, Vue, Nuxt and Svelte list each category's vendors with a switch per vendor. Switches edit the draft and record on Save, disable while the category is off, and clear on Accept all and Reject all. React adds `useVendorDraft`, `useVendorAllowed`, `useDeclaredVendors` and `useVendorChoice`; `useConsentDraft` gains `vendors` and `setVendor`; the Svelte manager state gains `selectedVendors` and `setSelectedVendor`.

Denials persist in a `<storageKey>-vendors` cookie and localStorage entry and reach the backend as `vendorChoice`. Migration `4-vendor-choice` adds the column, so run the migrator before deploying. A denial has no expiry and does not delete cookies the vendor already set.

Also fixed: the Vue preference center rendered its switches and category rows unstyled in Nuxt, and the Vue and Svelte category description colour differed from React's.

# @c15t/ui

## 3.0.0-alpha.1

### Patch Changes

- 46f45c4: Render theme CSS in the server HTML to prevent React and Next.js consent banners from flashing default styles before hydration. Preserve the stylesheet and CSP nonce through hydration, and escape theme values so HTML-like strings remain inside the stylesheet.

  Apply explicit dark mode and system color preferences before hydration while preserving client-side theme updates.

  Reduce the theme generator's initial JavaScript and generated CSS size without changing theme tokens or contrast colors.

- Updated dependencies [dd44a61]
  - @c15t/core@3.0.0-alpha.1

## 3.0.0-alpha.0

### Major Changes

- 4460e3e: This v3 alpha is for internal use only. APIs are unstable, and breaking changes will occur between alpha releases.

  Introduce the c15t umbrella package, shared consent runtime and policy rules, rewritten backend, and new framework and script-tag integrations. Update the CLI, IAB support, DevTools, and shared styles for v3.

  Packages now ship ESM only. Keep related packages on compatible v3 alpha versions.

  Export `defineTheme` and the `Theme` type from the React, Next.js, TanStack Start, and Vue entries so themes can use the same imports as their framework integration.

  Restrict iframe-blocker URL activation to HTTP and HTTPS. Replace backtracking URL and theme parsing expressions, correct the PostHog hostname boundary, and fix CLI layout detection for nested route groups and locale directories.

  Serve a stale consent manifest from the server adapters' in-process cache inside the backend's `stale-while-revalidate` window while one background request revalidates it, instead of blocking every request after `s-maxage` expires; a failed or timed-out revalidation keeps the stale manifest. The backend sends its manifest cache policy as `CDN-Cache-Control` too, so Vercel's CDN forwards it. Add `onBackgroundRevalidate` to the core cache and every server adapter for runtimes that stop detached work after the response.

### Patch Changes

- Updated dependencies [4460e3e]
  - @c15t/core@3.0.0-alpha.0
  - @c15t/translations@3.0.0-alpha.0

## 2.2.0-canary-20260731105620

### Patch Changes

- c187c9d: Add a `nonce` option for nonce-based Content Security Policies

  The injected `<style id="c15t-theme">` element previously carried no nonce, so a strict CSP blocked it unless you allowed `'unsafe-inline'`. Setting `nonce` on the provider options now applies it to that stylesheet and to every `<script>` element created by the script loader. A per-script `nonce` still takes precedence.

  ```tsx
  <ConsentManagerProvider options={{ mode: "offline", nonce }}>
    {children}
  </ConsentManagerProvider>
  ```

- Updated dependencies [c187c9d]
  - c15t@2.2.0-canary-20260731105620

## 2.2.0-canary-20260727202135

### Minor Changes

- ace6760: Add a policy-aware `consentActions.primary` theme key. It styles whichever action(s) the active policy marks as primary (`ui.banner.primaryActions`), so the policy decides which action is primary while the theme decides how a primary action looks. Resolution order: explicit props → per-action keys (`accept`/`reject`/`customize`) → `primary` → `default` → fallback.

  The IAB consent banner previously hardcoded its button variants, bypassing `consentActions`; it now resolves button treatments through the same logic, keeping its stock styling as the fallback.

### Patch Changes

- b032a69: Add `ConsentDialogTriggerToolbar` to React and Next.js as an opt-in, draggable toolbar with app-owned actions and exactly one built-in consent preferences action. The existing `ConsentDialogTrigger` remains unchanged.
- 16a1f82: Dependency audit for the next release: remove unused `@orpc/*` dependencies from `@c15t/backend` and `@c15t/node-sdk`, update runtime dependencies (hono 4.12.27, valibot 1.4.2, defu 6.1.7, jose 6.2.3, zod 4.4.3, zustand 5.0.14, xstate 5.32.4, and more), and force security floors for kysely (SQL injection fixes) and protobufjs via workspace overrides. Builds now use TypeScript 7 (native compiler) with rslib 0.23 for type checking and declaration emit; emitted types are semantically unchanged.
- Updated dependencies [1d24803]
- Updated dependencies [05b0abb]
- Updated dependencies [16a1f82]
- Updated dependencies [c8690f9]
- Updated dependencies [ace6760]
- Updated dependencies [c7e53ff]
- Updated dependencies [ace6760]
- Updated dependencies [e4315bd]
- Updated dependencies [5406a8d]
- Updated dependencies [0c97773]
- Updated dependencies [ca7784f]
- Updated dependencies [30cb116]
- Updated dependencies [c8690f9]
  - @c15t/translations@2.2.0-canary-20260727202135
  - c15t@2.2.0-canary-20260727202135

## 2.1.0

### Minor Changes

- 4a89092: Expanded the script loader with a registry-backed provider system and a much
  broader set of consent-aware integrations. New helpers cover analytics,
  advertising pixels, functional tools, and tag managers, including Ahrefs,
  Cloudflare Web Analytics, Fathom, Hotjar, Matomo, Microsoft Clarity, Mixpanel,
  Plausible, PromptWatch, Rybbit, Segment, Umami, Vercel Analytics, Reddit Pixel,
  Snapchat Pixel, and Crisp/Intercom.

  Provider manifests now share common utilities for script URL resolution, boolean
  data attributes, install-step builders, Google consent mapping, and lifecycle
  execution. The package also includes registry metadata, focused provider tests,
  and engine coverage so script helpers resolve predictable loader URLs,
  attributes, consent callbacks, and queued vendor calls.

  Google Tag and Google Tag Manager boot timestamps now resolve during script
  lifecycle execution instead of helper construction, which keeps documented setup
  patterns compatible with Next.js Cache Components prerendering.

  PostHog now supports explicit EU/US region selection, keeps the bootstrap script
  host aligned with an explicit API host, and exposes loading modes for immediate
  cookieless consent sync, consent-gated loading, or disabling the helper without
  issuing a PostHog network request.

  Updated the docs and CLI generation prompts so these providers are discoverable
  from the integration docs and script-loader setup flows.

### Patch Changes

- Updated dependencies [1588a24]
- Updated dependencies [4a89092]
  - @c15t/translations@2.1.0
  - c15t@2.1.0

## 2.0.3

### Patch Changes

- Updated dependencies [748536a]
  - c15t@2.0.4

## 2.0.2

### Patch Changes

- 10cec50: Fix consent widget footer slot styling so container classes no longer leak onto nested footer subgroups.

## 2.0.1

### Patch Changes

- 50e17f0: Fix Tailwind CSS v3 stylesheet packaging so package resolvers that do not follow nested CSS imports still include the generated c15t component rules.

  Root `styles.tw3.css` and `iab/styles.tw3.css` proxy entrypoints are now published, and the React/Next.js Tailwind v3 dist stylesheets inline the generated UI CSS instead of forwarding through nested package imports.

## 2.0.0

### Major Changes

- 32617c9: Changelog available at https://c15t.com/changelog/2.0.0

### Patch Changes

- Updated dependencies [32617c9]
- Updated dependencies [32617c9]
  - c15t@2.0.0
  - @c15t/translations@2.0.0

## 2.0.0-rc.11

### Patch Changes

- aa2bb42: Fix consent switch sizing so it renders consistently in Tailwind and non-Tailwind apps.

  - `@c15t/ui`: make the shared switch primitive use an explicit `border-box` layout, size its track independently of host box-model resets, and clip the track so the thumb ring does not bleed past the edge.
  - `@c15t/react`: publish the updated prebuilt consent UI styling so React consumers pick up the normalized switch sizing.
  - `@c15t/nextjs`: publish the updated stylesheet bridge so Next.js installs pick up the normalized switch sizing as well.

## 2.0.0-rc.10

### Minor Changes

- 79ae8cf: Remove the legacy stock-branding theme keys and require the new explicit tag slots for prebuilt consent surfaces.

  - `@c15t/react`: stop resolving stock banner/dialog/widget/IAB branding tags through legacy footer-branding aliases and render the standalone widget/dialog tags without the old footer-wrapper compatibility path.
  - `@c15t/ui`: add explicit branding tag slots for each prebuilt surface: `consentBannerTag`, `consentDialogTag`, `consentWidgetTag`, `iabConsentBannerTag`, and `iabConsentDialogTag`.

  Breaking change:

  - `consentWidgetBranding` has been removed. Use `consentWidgetTag`.
  - `consentDialogFooter` no longer styles the stock dialog branding tag. Use `consentDialogTag`.
  - Style stock banner and IAB branding tags via the new explicit tag slots instead of footer-related keys.

### Patch Changes

- 64d6009: Replace the shared `clsx` dependency with a local `cn` implementation owned by `@c15t/ui`.

  - `@c15t/ui`: own the public `ClassValue` type and `cn(...)` implementation directly instead of re-exporting them from `clsx`, with coverage for nested arrays, object maps, numeric values, and ordering.
  - `@c15t/react`: continue consuming the shared `@c15t/ui` class helper while dropping the now-unused direct `clsx` dependency from the published package.
  - `@c15t/dev-tools`: remove the unused direct `clsx` dependency from the published package manifest.

- 7576dc1: Derive `textOnPrimary` automatically from the active `primary` theme color when it is omitted, so primary-filled surfaces such as stock branding tags keep a readable foreground by default.

  - add a shared contrast helper in the UI theme utilities and use it as the fallback for `textOnPrimary`
  - preserve explicit `textOnPrimary` overrides for consumers who need a fixed branded foreground

- Updated dependencies [9579b62]
  - c15t@2.0.0-rc.10

## 2.0.0-rc.9

### Patch Changes

- 59b850b: Harden the prebuilt consent-surface branding against host-page CSS so the INTH and c15t wordmarks stay correctly sized across docs, marketing sites, and other embedded app shells.

  - `@c15t/react`: wrap both prebuilt full-logo branding paths in shared internal wordmark containers instead of attaching sizing classes directly to the raw `svg` elements.
  - `@c15t/ui`: move the logo constraints onto the internal branding wrappers and nested `svg` elements, adding explicit flex, max-width, block-layout, and aspect-ratio rules so global host-page `svg` styles cannot blow up or collapse either wordmark.
  - `@c15t/nextjs`: keep the published styled surface behavior aligned with the hardened React/UI branding path used by the prebuilt consent banner and dialog components.

## 2.0.0-rc.8

### Patch Changes

- cd9c830: Fix the `PolicyActions` DX regressions and the published stylesheet packaging for the prebuilt consent UI.

  - `@c15t/ui`: deduplicate policy-action helper ownership behind `c15t`, normalize widget footer subgroup naming, and add direct coverage for action-group flattening.
  - `@c15t/react`: share the internal `PolicyActions` renderer across banner and widget, add `consentAction` to policy-action render props so stock overrides preserve built-in theming, restore the banner default footer layout when policy hints do not provide a layout, and extend regression coverage.
  - `@c15t/nextjs`: keep the published stylesheet bridge files aligned with the package entrypoints and publish-artifact guard.

- fee82fd: Refine prebuilt consent-surface branding so it feels attached to the UI instead of appended.

  - `@c15t/react`: add attached branding tags to the stock consent banner, consent dialog, IAB banner, and IAB dialog; localize the branding copy through translations; and add a `hideBranding` prop to the stock `ConsentBanner` component.
  - `@c15t/nextjs`: keep the published stylesheet entrypoints aligned with the updated prebuilt branding treatment while simplifying stylesheet distribution to reference upstream package styles directly.
  - `@c15t/ui`: update the shared consent branding tag styles for tighter edge attachment, smaller visual footprint, and consistent banner/dialog treatment across standard and IAB surfaces.
  - `@c15t/translations`: add the shared localized branding copy used by the updated prebuilt consent surfaces.

- Updated dependencies [43f1b68]
- Updated dependencies [3d4c107]
- Updated dependencies [c944e35]
- Updated dependencies [5956531]
- Updated dependencies [fee82fd]
  - c15t@2.0.0-rc.8
  - @c15t/translations@2.0.0-rc.8

## 2.0.0-rc.7

### Minor Changes

- ec30bd1: feat(primitives): shared UI primitive runtime, framework adapters, and runtime performance

  - Extract seven framework-agnostic primitives into `@c15t/ui/primitives`: accordion, button, collapsible, dialog, switch, tabs, and preference-item
  - Add `PreferenceItem` compound component that unifies three separate expandable-row patterns (Radix Accordion, custom button + AnimatedCollapse, manual state) into a single composable primitive with semantic slots
  - Publish framework adapter packages (`@c15t/solid`, `@c15t/vue`, `@c15t/svelte`) re-exporting shared primitives and CSS variant generators
  - Add cross-framework storybooks with shared play-function interaction tests and CI test-runner integration

  **Mobile viewport fixes:**

  - Add `box-sizing: border-box` to all fixed-position consent roots (banner, dialog, IAB variants) — prevents horizontal overflow on narrow viewports
  - Constrain dialog card with `max-height: 100%` and scrollable content area — prevents title/description from being pushed off-screen on small devices

  **Runtime performance (react-browser-bench, full-ui scenario):**

  - Memoize `useTheme()` deep merge with `useMemo` — reduces calls from 35 to 23 (-35%), total time from 0.10 ms to 0.02 ms (-80%)
  - Replace `offsetWidth`/`offsetHeight` visibility checks in focus trap with `checkVisibility()` API — eliminates forced synchronous layout on every Tab keypress
  - Both optimizations are in `@c15t/ui` and benefit all frameworks equally

## 2.0.0-rc.6

### Patch Changes

- 5c8ee05: feat(styles): ship explicit stylesheet entrypoints for prebuilt UI

  - Publish explicit `styles.css` and `iab/styles.css` entrypoints for prebuilt UI in `@c15t/ui`, `@c15t/react`, and `@c15t/nextjs`
  - Update docs and CLI setup so stylesheet imports and Tailwind host-app configuration are explicit
  - Support the documented Tailwind 3 and Tailwind 4 layering model without requiring `!important`
  - Add automated first-paint CDP benchmark (`benchmarks/vite-react-repro/scripts/run-first-paint-bench.ts`)

  **Bundle impact (vite-react-repro):**

  - JS: 435.5 KB → 361.0 KB (-74.5 KB raw, -13.4 KB gzip / -11%)
  - CSS: 0.8 KB → 49.2 KB (moved from JS to CSS — net gzip saving: -6.5 KB / -5%)
  - `createElement("style")` runtime calls: eliminated
  - JS heap: -143 KB (-8%)

  **Main-thread impact (6x CPU throttle, 3 runs × 60 samples):**

  - JS evaluation: 64.5 ms → 53.1 ms (-11.4 ms / -17.7%)
  - Total → first paint: 87.8 ms → 76.5 ms (-11.3 ms / -12.9%)

- Updated dependencies [e08e52c]
- Updated dependencies [bb3ab0f]
- Updated dependencies [1a724fc]
  - c15t@2.0.0-rc.6

## 2.0.0-rc.5

### Patch Changes

- 5f30a3b: Add browser prefetch utilities for faster consent banner visibility

  - New `buildPrefetchScript()` and `getPrefetchedInitialData()` in `c15t` core to start the `/init` request before framework hydration
  - New `C15tPrefetch` component in `@c15t/nextjs` using `next/script` with `beforeInteractive` strategy for static-route-compatible prefetching
  - Tuned default motion tokens (fast: 80ms, normal: 150ms, slow: 200ms) and replaced hardcoded CSS durations with theme variables

- 58fb392: Rename translation-facing APIs from `translations` to `i18n` across runtime types and helpers.
  Add CLI migration codemods to update existing projects to the new naming.
- e79f840: Separate published declaration files from runtime bundles to improve Vite compatibility

  - Move generated `.d.ts` files out of `dist/` into `dist-types/` across published packages
  - Stop emitting declaration maps in shared TypeScript config so `.d.ts.map` files are no longer published
  - Emit declarations only once per package to avoid unstable output when both `esm` and `cjs` builds write types
  - Update package `types` metadata, publish file lists, Turbo outputs, and publish artifact checks for the new layout
  - Verify the package layout works in Vite 7 without `optimizeDeps.exclude` workarounds for `c15t` and `@c15t/react`

- Updated dependencies [021ac99]
- Updated dependencies [5f30a3b]
- Updated dependencies [58fb392]
- Updated dependencies [e79f840]
- Updated dependencies [58fb392]
- Updated dependencies [60a51f1]
- Updated dependencies [372cf92]
  - c15t@2.0.0-rc.5
  - @c15t/translations@2.0.0-rc.5

## 2.0.0-rc.4

### Patch Changes

- Updated dependencies [06ee724]
- Updated dependencies [29819bc]
  - @c15t/translations@2.0.0-rc.4
  - c15t@2.0.0-rc.4

## 2.0.0-rc.3

### Patch Changes

- de6dd82: fix(ui): dark mode not being applied
- Updated dependencies [1c813bc]
- Updated dependencies [0f10f3e]
  - c15t@2.0.0-rc.3

## 2.0.0-rc.2

### Patch Changes

- 408df0e: feat: CMP ID now comes from backend, either inth.com when hosted or BYO CMP ID
  feat: Center the IAB Banner for better policy compliance
  feat: Improve doc comments around IAB
- e6bc5db: fix: update import paths from .css to .js for component styles
- 684bf2a: fix(ui): dialog width customization, disableAnimation preventing dialog from showing
- Updated dependencies [408df0e]
  - c15t@2.0.0-rc.2

## 2.0.0-rc.1

### Patch Changes

- 0bc4f86: fixed workspace resolving
- Updated dependencies [0bc4f86]
  - @c15t/translations@2.0.0-rc.1
  - c15t@2.0.0-rc.1

## 2.0.0-rc.0

### Major Changes

- 126a78b: https://c15t.com/changelog/2.0.0-rc.0

### Patch Changes

- Updated dependencies [126a78b]
  - c15t@2.0.0-rc.0
  - @c15t/translations@2.0.0-rc.0
