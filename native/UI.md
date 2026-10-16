# c15t native consent UI

This is the spec for the built-in consent screens on phones. React Native
implements it today in `packages/react-native`. The SwiftUI and Compose UIs will
follow the same spec. `CONTRACT.md` covers what the cores store and decide. This
file covers what the subject sees and presses. The
[React Native API guide](react-native-ui.md) covers component props and migration.

The rule underneath everything: **a builder decides what exists, and a renderer
decides how it looks.** Which screens there are, which rows they hold, which
switches are locked, and which actions sit at parity are settled in pure
functions (`packages/react-native/src/ui-model`). Every renderer draws the same
answer, and the fixtures in `native/ui` prove it.

## Screen graph

| Flow | Screens |
| --- | --- |
| Standard | **First layer** in a bottom sheet → *Manage preferences* → **Preferences**, pushed inside the same sheet as it grows to full height |
| Standard, from app settings | **Preferences** on its own: a page, a sheet, or inline in a host screen (`ConsentWidget`) |
| IAB | **IAB first layer** in a bottom sheet → *Manage options* → **Manage** (Purposes / Partners segments) → **Purpose detail** or **Partner detail**, pushed |

| Screen id | Builder | Opened by |
| --- | --- | --- |
| `firstLayer` | `buildFirstLayer({ copy, notice })` | the host, when the policy asks |
| `preferences` | `buildPreferences({ copy, rows, hideBranding })` | `manage` on the first layer, or the host |
| `iab.firstLayer` | `buildIabFirstLayer({ copy, model })` | the host, under an IAB rule |
| `iab.manage` | `buildIabPurposes({ copy, model, selection })` | `manage`, or the Purposes segment |
| `iab.vendors` | `buildIabVendors({ copy, model, selection, query })` | the partners row, or the Partners segment |
| `vendor.<id>` | `buildIabVendorDetail({ copy, model, selection, vendorId })` | a partner row |
| `purpose.N`, `stack.N`, `specialFeature.N`, `specialPurpose.N`, `feature.N` | `buildIabPurposeDetail({ copy, model, selection, routeId })` | a purpose, stack, or feature row |

A row's `navigatesTo` is the screen id to push. A builder returns `null` for a
route the model doesn't carry. The renderer then pops back instead of drawing an
empty screen.

## Screen model

The types live in `packages/react-native/src/ui-model/types.ts`. They are plain
JSON:

```ts
Screen   { id, title, intro?, sections: Section[], actions: Action[], branding?, empty? }
Section  { id, header?, footer?, rows: Row[] }
Row      { id, title, detail?, control?, navigatesTo?, info? }
control  { kind: 'switch', value, disabled }
       | { kind: 'value', text }
       | { kind: 'link', url }
Action   { id: 'acceptAll' | 'rejectAll' | 'save' | 'acknowledge' | 'manage',
           label, emphasis: 'primary' | 'parity' | 'tonal' | 'text' }
```

- **Row ids are toggle keys.** A switch row's id is what a press writes:
  `category.<name>`, `purpose.N`, `stack.N`, `specialFeature.N`,
  `vendor.<id>.consent`, and `vendor.<id>.legitimateInterest`. For the last one,
  `true` means "not objected".
- **`info`** is an explanation the renderer shows on request, as a system alert
  opened from an info button. It is never shown inline.
- **`empty`** replaces the sections when a search matches nothing.
- **`branding`** is the lead-in for the "Secured by c15t" footnote. It is absent
  when the host hides branding.

Press handling for IAB switches is `applyIabToggle(model, selection, rowId,
value)`, in `iab-selection.ts`. The draft starts from `seedConsentIabSelection`,
and Accept all and Reject all come from `decideConsentIabSelection`. Ports
translate these three functions line for line.

## Rules with legal weight

Builders enforce these rules, and fixtures pin them. A renderer can't change
them.

- **Parity on first layers.** Accept all and Reject all both carry
  `emphasis: 'parity'`. A renderer draws parity actions with the same style,
  size, and color, one above the other. Reject is never a text link.
- **Necessary** is a switch that is disabled and on. Nothing says "Always
  active", so there is no string to translate.
- **A restricted category** is disabled and off.
- **A purpose no partner holds on consent** keeps its row, with a disabled
  switch that is off. A press on it changes nothing.
- **Stacks** cover only their consent-basis purposes. A stack is on when every
  covered purpose is on. When only some are, it is off with the
  `partiallyEnabled` detail. Toggling a stack moves only the covered purposes.
- **No cascade.** Turning a purpose off does not touch partner switches.
- **Special purposes and features** have no switch, because TCF Policies forbid
  a control next to processing that cannot be refused.
- **The IAB first layer** always states the partner count and lists every
  purpose, stack, and special feature, with the legitimate interest notice
  under them.
- **Dismissal never records consent.** See [Dismissal](#dismissal).

## Fixtures

`native/ui` holds the scenarios every renderer replays:

```
native/ui/index.json             manifest: count, fixtures[], inputs[], with bytes + sha256
native/ui/inputs/<name>.json     shared inputs: iab-copy, iab-model, standard-copy
native/ui/fixtures/<id>.json     { builder, description, expected, id, input, version: 1 }
```

An input value of `{"$ref": "<name>"}` stands for `inputs/<name>.json`. Resolve
it before calling the builder. Compare the result with `expected` after a JSON
round trip, so an absent key and an undefined one are equal.

Never edit these files by hand. Change a builder and regenerate:

```sh
bun run --cwd packages/react-native generate:ui-fixtures
```

The RN suite (`src/ui-model/__tests__/ui-fixtures.test.ts`) checks the hashes
and replays every fixture. The Swift and Kotlin suites should do the same.

## What a renderer decides

A renderer may decide:

- fonts, sizes, spacing, colors, radii, and motion, per platform
- the sheet, the page, the navigation bar, and the back gesture
- whether a section header or footer renders as a caption, a list header, or
  supporting text
- how a `link` row opens, such as an in-app browser or the system browser
- the order of the footer actions in a horizontal layout, as long as parity
  actions stay identical

A renderer may not:

- add, drop, rename, or reorder actions, rows, or sections
- enable a disabled switch, or show a switch where the model has none
- give a parity action a weaker style than its partner
- record a decision on dismissal

## Platform mapping

| Concept | iOS (RN → SwiftUI) | Android (RN → Compose) |
| --- | --- | --- |
| First-layer sheet | grabber 36×5, top radius 10, content-sized, `systemBackground` → `.sheet` + `.presentationDetents([.medium, .large])` | drag handle 32×4, top radius 28, 32% scrim → `ModalBottomSheet` |
| Standalone page | `Modal presentationStyle="pageSheet"` → `.sheet` + `NavigationStack` | full-screen `Modal` with a top app bar → `Scaffold` + `TopAppBar` |
| Navigation bar | 44pt, centered 17pt semibold title, tinted "‹ Back" | 64dp, left-aligned 22sp title, ← labelled "Back" |
| Push / pop | the new screen slides in from the right edge, the old one shifts 30% left, 350ms; swipe from the left edge to go back | shared axis X: 30dp slide plus fade, 300ms; system back pops before it closes |
| List | inset grouped, cell radius 10, hairline separators inset 16, rows ≥ 44pt, 17pt titles, 13pt footers | M3 list items 56 / 72dp, 16sp headline, 14sp supporting text, no cards |
| Switch | system `UISwitch`, tinted with `primary` | system switch, tinted with `primary` |
| Segments | segmented control | primary tabs with an indicator |
| Search | 36pt field, radius 10, tertiary fill | 56dp pill search bar |
| Buttons | 50pt, radius 12, 17pt semibold: filled / tinted / plain | 48dp touch target around a pill button: filled / filled tonal / text |
| `info` | `Alert.alert` → `.alert` | `Alert.alert` → `AlertDialog` |
| `link` | `Linking` → `SFSafariViewController` | `Linking` → Custom Tabs |
| Type | system font, Dynamic Type | system font, font scale |

Emphasis maps to buttons like this:

| Emphasis | iOS | Android |
| --- | --- | --- |
| `primary` | filled | filled |
| `parity` | filled, both actions identical | filled, both actions identical |
| `tonal` | tinted | filled tonal |
| `text` | plain | text |

## Tokens

The UI should read as part of the host app. The c15t brand shows up in three
places only:

- **Tint.** `primary` defaults to c15t blue, `#3355FF` in light mode and
  `#6680FF` in dark. It drives filled buttons, links, switch tracks, and the
  segment indicator. A host's `theme.colors.primary` replaces it, and that is the
  expected case in production.
- **Footnote.** "Secured by c15t" closes the preferences list, unless the host
  sets `hideBranding`. The first layer carries no mark.
- **Copy.** The English fallbacks talk about an app, not a website.

Everything else comes from the system: fonts, grays, grouped backgrounds,
separators, switch shapes, sheet radii, and motion. Colors are semantic
(`primary`, `onPrimary`, `primaryContainer`, `onPrimaryContainer`, `background`,
`surface`, `label`, `secondaryLabel`, `separator`, `fill`, `scrim`). Each one
resolves from the platform and the color scheme first. Host overrides merge on
top, with `darkColors` for the dark scheme.

## Motion

- The sheet rises with a spring, and leaves with an ease-in of about 250ms.
- Push and pop follow the platform values in the mapping table.
- With reduced motion on, slides become a 150ms crossfade, and springs become
  timing curves with no overshoot.
- A sheet in choice mode resists a drag below its detent and springs back.

## Dismissal

| Where | Gesture | Result |
| --- | --- | --- |
| First layer, choice mode | drag down, scrim tap | resists and springs back; nothing recorded |
| First layer, notice mode | drag down, scrim tap | dismisses the notice (`dismissNotice`) |
| Full-height sheet, pushed screen | drag down, back | pops one screen |
| Standalone page | swipe down, back, close | calls `onClose` and discards the draft |
| Android system back | anywhere | pops one screen, then behaves like the row above it |

## Accessibility

- Focus moves to the new screen's title on push and on pop.
- A switch row exposes the switch role, with the row title as its label.
  Rows that also open details expose a separate navigation button.
- Hit targets are at least 44pt on iOS and 48dp on Android.
- The sheet and the page are modal to assistive tech.
- Text scales with the system. Only buttons cap their scale, so the footer
  still fits.

## Copy keys

The standard flow reads `ConsentCopy` (`internal/copy.ts`): `bannerTitle`,
`bannerDescription`, `noticeTitle`, `noticeDescription`, `acceptAll`,
`rejectAll`, `acknowledge`, `preferences`, `dialogTitle`, `dialogDescription`,
`save`, `securedBy`, `back`, `close`, and `categories.<name>.{title,
description}`.

The IAB flow reads `ConsentIabCopy` (`internal/iab-copy.ts`). Counts use
`{count}`, with a separate singular key (`partner`, `day`). The first-layer body
uses `{partnerCount}`, and the empty search uses `{searchTerm}`.
