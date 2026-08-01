---
title: YouTube
description: Keep YouTube iframes unmounted until consent with a
  privacy-enhanced, lazy-loaded React or Next.js embed.
icon: youtube
group: integrations
---
`YouTubeEmbed` is a renderable integration for React and Next.js. It uses c15t's
`Frame` consent boundary, so the YouTube iframe is not mounted and no YouTube
request is made until the configured consent category is allowed.

The component does not load the YouTube IFrame Player API. It is intended for
standard iframe embeds and keeps script readiness separate from iframe gating.

## Integrate with c15t

`YouTubeEmbed` must render inside a `ConsentManagerProvider`. Complete the
[React quickstart](/docs/frameworks/react/quickstart) or
[Next.js quickstart](/docs/frameworks/next/quickstart) first.

**React**

```tsx
import { YouTubeEmbed } from '@c15t/react';

export function ProductVideo() {
  return (
    <YouTubeEmbed
      consentCategory="marketing"
      params={{ controls: true, playsinline: true }}
      title="Product overview"
      videoId="dQw4w9WgXcQ"
    />
  );
}
```

**Next.js**

```tsx
'use client';

import { YouTubeEmbed } from '@c15t/nextjs';

export function ProductVideo() {
  return (
    <YouTubeEmbed
      consentCategory="marketing"
      params={{ controls: true, playsinline: true }}
      title="Product overview"
      videoId="dQw4w9WgXcQ"
    />
  );
}
```

`marketing` is the default category. Choose a different category only when it
matches the purpose of the embed and the policy presented to your users.

## How c15t loads it

* **Before consent:** c15t renders a placeholder and does not mount the iframe.
* **After consent:** the iframe mounts with its final embed URL.
* **On revocation:** the `Frame` boundary unmounts the iframe, stopping the
  embedded player and future requests from that document.
* **Loading behavior:** c15t reserves the final player size, shows a localized
  loading state, and uses native iframe lazy loading by default.
* **Default layout:** the placeholder and player share a responsive 16:9,
  borderless frame with a `200px` minimum height.
* **Privacy-enhanced mode:** URLs built from `videoId` use
  `youtube-nocookie.com` by default.

Privacy-enhanced mode changes the YouTube host but does not replace consent
gating. Keep the iframe behind the category required by your privacy policy.

## Build the embed URL

Prefer `videoId` when you control the video:

```tsx
<YouTubeEmbed
  consentCategory="marketing"
  params={{
    autoplay: false,
    controls: true,
    playsinline: true,
    rel: false,
  }}
  start={36}
  title="Quarterly product update"
  videoId="dQw4w9WgXcQ"
/>
```

Boolean `params` are serialized as YouTube's `1` and `0` values. `start` is
serialized as the player's start time in seconds. If `params.start` is also
present, the top-level `start` prop takes precedence.

Set `privacyEnhanced={false}` only when you intentionally need the regular
`youtube.com` host.

### Migrate an existing iframe URL

Use `src` when you already have a complete embed URL:

```tsx
<YouTubeEmbed
  consentCategory="marketing"
  src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?start=36"
  title="Quarterly product update"
/>
```

When `src` is provided, c15t uses it unchanged. TypeScript treats `src` and
`videoId` as mutually exclusive source modes: `start`, `params`, and
`privacyEnhanced` are available only with `videoId`.

## Style the wrapper and iframe

`wrapperClassName` targets the consent-gated `Frame`. `className` and the
forwarded ref target the iframe itself.

The defaults are responsive and stable without utility classes. Override them
only when your layout needs a different aspect ratio or height:

```tsx
<YouTubeEmbed
  consentCategory="marketing"
  frameProps={{ style: { aspectRatio: '4 / 3', minHeight: 280 } }}
  style={{ borderRadius: 4 }}
  title="Product overview"
  videoId="dQw4w9WgXcQ"
/>
```

`frameProps.style` is merged after the wrapper defaults. The iframe fills that
wrapper, has no border, and inherits the wrapper radius by default.

## Customize the placeholder

```tsx
import { Frame, YouTubeEmbed } from '@c15t/react';

<YouTubeEmbed
  consentCategory="marketing"
  placeholder={
    <Frame.Root>
      <Frame.Title>Allow marketing consent to watch this video.</Frame.Title>
      <Frame.Button category="marketing" />
    </Frame.Root>
  }
  title="Product overview"
  videoId="dQw4w9WgXcQ"
/>
```

Custom placeholders should explain why the content is blocked and provide a
clear way to change consent. Always give the iframe a meaningful `title`.

Use `loadingFallback` to replace the post-consent loading message and
`errorFallback` to replace the configuration error state. If neither `videoId`
nor `src` is supplied at runtime, the component renders that error state instead
of mounting an iframe.

Standard cross-origin iframes do not provide a reliable player-error signal.
`YouTubeEmbed` forwards the iframe's native `onError` when a browser emits it,
but player-level errors require the YouTube IFrame Player API and are outside
this iframe-only component.

## Verify setup

1. Clear saved consent and reload the page.
2. Confirm there is no YouTube iframe or YouTube network request before consent.
3. Grant the configured category and confirm exactly one iframe mounts.
4. Confirm a `videoId` embed uses `youtube-nocookie.com` unless
   `privacyEnhanced={false}`.
5. Revoke consent and confirm the iframe is removed.
6. Confirm the default 16:9 frame is borderless and reserves the same space at
   mobile and desktop widths.

See YouTube's [embedded player parameters](https://developers.google.com/youtube/player_parameters)
for the supported query parameters.

## Types

### YouTubeEmbedProps

|Property|Type|Description|Default|Required|
|:--|:--|:--|:--|:--:|
|YouTubeEmbedProps|YouTubeEmbedProps|Type alias for YouTubeEmbedProps|-|✅ Required|
