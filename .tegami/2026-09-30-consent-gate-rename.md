---
packages:
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
