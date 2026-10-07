---
packages:
  "@c15t/astro":
    replay:
      - exit-prerelease(npm:@c15t/astro)
---

### Apply `theme.consentActions` to the Astro banner

`<ConsentBanner />` reads `consentActions` from the integration's `theme` and
picks each button's mode and variant like the React banner. Before, every
button was a stroke button. On a notice with one button, the acknowledgement
button is the primary action.
