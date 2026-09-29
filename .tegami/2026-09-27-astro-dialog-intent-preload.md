---
packages:
  "@c15t/astro":
    replay:
      - exit-prerelease(npm:@c15t/astro)
---

### Start loading the Astro preference dialog on hover and focus

The preference dialog is an island that downloads the first time it opens, so
the first Customize click waited for the framework runtime and the dialog to
download. Pointing at or focusing a control that opens the preference dialog
now starts that download. With a mouse the dialog is usually there by the time
the click lands. Visitors who only accept or reject still download nothing,
and a failed download is retried on the next hover, focus or open.
