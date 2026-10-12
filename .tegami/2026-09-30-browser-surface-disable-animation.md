---
packages:
  "@c15t/browser":
    replay:
      - exit-prerelease(npm:@c15t/browser)
---

### Set `disableAnimation` per surface and from the script tag

The `banner` and `dialog` UI options accept `disableAnimation`, which overrides the UI-level `disableAnimation` for that surface. The script tag reads `data-disable-animation` to turn animations off for the whole UI.

```html
<script src="https://cdn.jsdelivr.net/npm/@c15t/browser@alpha/dist/c15t.js" data-disable-animation></script>
```
