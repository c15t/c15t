---
title: YouTube
description: Gate a YouTube iframe with the Frame component.
---
## Gate the embed

```tsx
import { Frame } from '@c15t/react';

export function Embed() {
  return (
    <Frame category="experience">
      <iframe
        src="https://www.youtube-nocookie.com/embed/VIDEO_ID"
        title="YouTube embed"
        loading="lazy"
        allowFullScreen
      />
    </Frame>
  );
}
```

Render this inside a consent provider. Include `experience` in the active policy's
category scope, or choose the category that describes your processing. `Frame`
checks effective permissions before mounting the iframe and removes it when that
permission is revoked. Its placeholder opens preferences; viewing the placeholder
does not record a choice.

The v2 specialized `YouTubeEmbed` component is removed.
Use `Frame` with an iframe URL supplied by the service. `Frame` does not add a
category to policy scope. For a JavaScript SDK integration, register its script
with the [script loader](/docs/frameworks/react/script-loader) and configure the
same category. Blocking a script cannot undo requests it already sent.

|Property|Type|Description|Default|Required|
|:--|:--|:--|:--|:--:|
|children|ReactNode|Content rendered when consent is granted. Children are not mounted until&#xA;consent is given, preventing unnecessary network requests.|-|✅ Required|
|category|AllConsentNames|Consent category required to render children.|-|✅ Required|
|placeholder|ReactNode|A custom placeholder component to display when consent is not met.&#xA;If not provided, a default placeholder will be displayed.|-|Optional|
|noStyle|boolean \|undefined|When true, removes all default styling from the component|false|Optional|
|theme|any|Custom theme to override default styles while maintaining structure and&#xA;accessibility. Merges with defaults. Ignored when \`noStyle=\{true}\`.|undefined|Optional|
