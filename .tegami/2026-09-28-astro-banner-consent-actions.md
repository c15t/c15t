---
packages:
  '@c15t/astro': patch
---

### Apply theme.consentActions to the Astro banner

`<ConsentBanner />` now reads `consentActions` from the integration's `theme` and sets each button's mode and variant in the same order as the React banner: the action's own key, then `primary` for the policy's primary action, then `default`. Before, every button was a stroke button and only the primary action got the primary variant. The banner the browser renders on prerendered hosted and manifest pages uses the same styles.

On a notice, the acknowledgement button is now the primary action when it is the only button, as it is in the React and Svelte banners.
