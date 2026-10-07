---
packages:
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
  "@c15t/core":
    replay:
      - exit-prerelease(npm:@c15t/core)
  "@c15t/ui":
    replay:
      - exit-prerelease(npm:@c15t/ui)
  "@c15t/translations":
    replay:
      - exit-prerelease(npm:@c15t/translations)
  "@c15t/schema":
    replay:
      - exit-prerelease(npm:@c15t/schema)
  "@c15t/backend":
    replay:
      - exit-prerelease(npm:@c15t/backend)
  "@c15t/react":
    replay:
      - exit-prerelease(npm:@c15t/react)
  "@c15t/nextjs":
    replay:
      - exit-prerelease(npm:@c15t/nextjs)
  "@c15t/tanstack-start":
    replay:
      - exit-prerelease(npm:@c15t/tanstack-start)
  "@c15t/vue":
    replay:
      - exit-prerelease(npm:@c15t/vue)
  "@c15t/svelte":
    replay:
      - exit-prerelease(npm:@c15t/svelte)
  "@c15t/react-native":
    replay:
      - exit-prerelease(npm:@c15t/react-native)
---

### Rename the remaining `frame` names to `consentGate`

**Breaking.** Names left over from `Frame`, the old name of `ConsentGate`, now
say `consentGate`.

- The translations section `frame` is now `consentGate`.
  `FrameTranslations` is now `ConsentGateTranslations`, and the old name stays
  as a deprecated alias.
- `@c15t/ui/styles/components/frame` is now
  `@c15t/ui/styles/components/consent-gate`, and `--frame-*` custom properties
  are now `--consent-gate-*`.
- Test ids `frame-placeholder` and `frame-open-dialog` are now
  `consent-gate-placeholder` and `consent-gate-button`. The title has
  `consent-gate-title`.

Copy under the old `frame` key still works and logs a warning outside
production. `@c15t/translations` exports the conversion as
`migrateLegacyTranslationKeys`. The `frame` stylesheet subpaths stay as
deprecated aliases for this alpha.

`theme.slots` gains `consentGate`, `consentGateTitle` and `consentGateButton`.
React and Vue also accept `components['consent-gate'].root`, `.title` and
`.button`.
