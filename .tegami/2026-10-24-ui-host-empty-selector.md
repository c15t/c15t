---
packages:
  "@c15t/browser":
    replay:
      - exit-prerelease(npm:@c15t/browser)
  "@c15t/dev-tools":
    replay:
      - exit-prerelease(npm:@c15t/dev-tools)
---

### Show the banner on pages that hide empty elements

The script-tag UI stayed hidden on pages with a rule such as
`div:empty { display: none; }`, which Shopify's Dawn theme ships. The banner
renders into a shadow root, and shadow content doesn't count as a child, so the
page rule matched the `<div data-c15t-ui>` host and hid it. c15t still reported
the banner as shown, so visitors saw nothing and no consent was saved.

The host now sets `display: block !important` inline, and page CSS can no longer
hide it. The DevTools panel's host gets the same fix. With `shadow: false` the
host has child elements and keeps no inline display.
