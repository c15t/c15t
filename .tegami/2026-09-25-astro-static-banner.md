---
packages:
  '@c15t/astro': patch
  '@c15t/cli': patch
---

### Show the Astro banner on prerendered pages

`ConsentBanner` rendered nothing on a prerendered page, because the build had
no policy, and the browser could only show or hide a banner that was already in
the HTML.

- In `offline()` mode the build now resolves the policy and renders the banner
  hidden. The browser shows it to visitors who have not chosen yet.
- In `hosted()` and `manifest()` mode, `ConsentBanner` leaves a placeholder.
  The browser renders the banner there, with the same markup as the server
  version, once its init returns a policy that needs one. Returning visitors
  do not download the renderer.
- A banner hidden after a choice no longer stays on screen: the stylesheet
  now makes the `hidden` attribute beat the banner's own `display`.
- The CLI's Astro boilerplate no longer tells you to avoid prerendering.
