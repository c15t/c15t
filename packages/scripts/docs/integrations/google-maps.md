---
title: Google Maps
description: Prevent a map iframe from mounting before the required permission.
group: integrations
---

## Configure the map

Copy the map's iframe embed URL. Choose the category matching its use in your
application; this example uses functionality permission.

```ts title="src/embed-config.ts"
export const embedCategory = 'functionality' as const;
export const embedURL = 'https://www.google.com/maps/embed?pb=YOUR_EMBED_PARAMETERS';
export const embedTitle = 'Map showing our office location';
export const embedAspectRatio = '4 / 3';
```

Replace the example URL with the complete embed URL for your map. Keep the
address and a directions link outside the consent-gated embed.

## Add the embed to your framework

Create `src/embed-config.ts` using the configuration on this page, then select
your framework. Keep the existing [consent setup](https://c15t.com/docs/frameworks), its policy
and preferences UI. These examples do not create a second consent provider.

**Next.js**

Render this component inside your existing consent boundary or provider.

```tsx title="src/consent-embed.tsx"
'use client';

import { Frame } from 'c15t/next';
import { embedCategory, embedURL, embedTitle, embedAspectRatio } from './embed-config';

export function ConsentEmbed() {
  return (
    <Frame category={embedCategory}>
      <iframe
        src={embedURL}
        title={embedTitle}
        loading="lazy"
        allowFullScreen
        style={{ width: '100%', aspectRatio: embedAspectRatio, minHeight: 200, border: 0 }}
      />
    </Frame>
  );
}
```

`Frame` keeps the iframe absent while permission is denied and removes it
on revocation. Keep your existing consent styles and preferences dialog.

**TanStack Start**

Render this component inside your existing consent boundary or provider.

```tsx title="src/consent-embed.tsx"
import { Frame } from 'c15t/tanstack-start';
import { embedCategory, embedURL, embedTitle, embedAspectRatio } from './embed-config';

export function ConsentEmbed() {
  return (
    <Frame category={embedCategory}>
      <iframe
        src={embedURL}
        title={embedTitle}
        loading="lazy"
        allowFullScreen
        style={{ width: '100%', aspectRatio: embedAspectRatio, minHeight: 200, border: 0 }}
      />
    </Frame>
  );
}
```

`Frame` keeps the iframe absent while permission is denied and removes it
on revocation. Keep your existing consent styles and preferences dialog.

**React**

Render this component inside your existing consent boundary or provider.

```tsx title="src/consent-embed.tsx"
import { Frame } from 'c15t/react';
import { embedCategory, embedURL, embedTitle, embedAspectRatio } from './embed-config';

export function ConsentEmbed() {
  return (
    <Frame category={embedCategory}>
      <iframe
        src={embedURL}
        title={embedTitle}
        loading="lazy"
        allowFullScreen
        style={{ width: '100%', aspectRatio: embedAspectRatio, minHeight: 200, border: 0 }}
      />
    </Frame>
  );
}
```

`Frame` keeps the iframe absent while permission is denied and removes it
on revocation. Keep your existing consent styles and preferences dialog.

**Nuxt**

Use the reactive snapshot from the existing consent runtime. The Nuxt module auto-imports the consent composables.

```vue title="app/components/ConsentEmbed.vue"
<script setup lang="ts">
import { embedCategory, embedURL, embedTitle, embedAspectRatio } from '../../src/embed-config';

const snapshot = useConsentSnapshot();
const activeUI = useConsentActiveUI();
</script>

<template>
  <iframe
    v-if="snapshot.effectivePermissions[embedCategory]"
    :src="embedURL"
    :title="embedTitle"
    loading="lazy"
    allowfullscreen
    :style="{ width: '100%', aspectRatio: embedAspectRatio, minHeight: '200px', border: 0 }"
  />
  <button v-else type="button" @click="activeUI = 'manager'">
    Open privacy settings to view this content
  </button>
</template>
```

Use `v-if` so a denied iframe is removed from the DOM. Hiding an existing
iframe with `v-show` or CSS does not prevent its requests.

**Vue**

Use the reactive snapshot from the existing consent runtime. The c15t Vue plugin must already be installed on this app.

```vue title="src/ConsentEmbed.vue"
<script setup lang="ts">
import { useConsentSnapshot, useConsentActiveUI } from 'c15t/vue/vue-plugin';
import { embedCategory, embedURL, embedTitle, embedAspectRatio } from './embed-config';

const snapshot = useConsentSnapshot();
const activeUI = useConsentActiveUI();
</script>

<template>
  <iframe
    v-if="snapshot.effectivePermissions[embedCategory]"
    :src="embedURL"
    :title="embedTitle"
    loading="lazy"
    allowfullscreen
    :style="{ width: '100%', aspectRatio: embedAspectRatio, minHeight: '200px', border: 0 }"
  />
  <button v-else type="button" @click="activeUI = 'manager'">
    Open privacy settings to view this content
  </button>
</template>
```

Use `v-if` so a denied iframe is removed from the DOM. Hiding an existing
iframe with `v-show` or CSS does not prevent its requests.

**Astro**

Use the shared browser helper below with Astro's existing page runtime.
Add this component to pages using your consent-enabled base layout:

```astro title="src/components/ConsentEmbed.astro"
<c15t-consent-embed style="display: block"></c15t-consent-embed>

<script>
  import { getConsentClient } from '@c15t/astro/client';
  import { mountConsentEmbed } from '../consent-embed';

  class ConsentEmbed extends HTMLElement {
    dispose?: () => void;

    connect = () => {
      if (this.dispose) return;
      const client = getConsentClient();
      if (!client) return;
      this.dispose = mountConsentEmbed(
        this,
        client.runtime.kernel,
        () => { void client.openDialog(); },
      );
    };

    connectedCallback() {
      document.addEventListener('DOMContentLoaded', this.connect, { once: true });
      this.connect();
    }

    disconnectedCallback() {
      document.removeEventListener('DOMContentLoaded', this.connect);
      this.dispose?.();
      this.dispose = undefined;
    }
  }

  if (!customElements.get('c15t-consent-embed')) {
    customElements.define('c15t-consent-embed', ConsentEmbed);
  }
</script>
```

The first mount waits for the page's module scripts, including c15t's boot
script. Later `ClientRouter` mounts reuse the existing runtime. Removing the
component unsubscribes and removes the iframe. Do not create another consent
runtime for this embed.

**Svelte**

Render this component inside the existing `ConsentManagerProvider`.
The provider from your quickstart supplies its consent state.

```svelte title="src/ConsentEmbed.svelte"
<script lang="ts">
  import { Frame } from '@c15t/svelte';
  import { embedCategory, embedURL, embedTitle, embedAspectRatio } from './embed-config';
</script>

<Frame category={embedCategory}>
  <iframe
    src={embedURL}
    title={embedTitle}
    loading="lazy"
    allowfullscreen
    style:width="100%"
    style:aspect-ratio={embedAspectRatio}
    style:min-height="200px"
    style:border="0"
  ></iframe>
</Frame>
```

The Svelte `Frame` waits until the browser is mounted and the category is
allowed. Its default placeholder opens preferences. Revocation removes the
iframe.

**SvelteKit**

Render this component inside the existing `ConsentManagerProvider`.
Keep the SvelteKit root provider and its server prefetch unchanged.

```svelte title="src/lib/ConsentEmbed.svelte"
<script lang="ts">
  import { Frame } from '@c15t/svelte';
  import { embedCategory, embedURL, embedTitle, embedAspectRatio } from '../embed-config';
</script>

<Frame category={embedCategory}>
  <iframe
    src={embedURL}
    title={embedTitle}
    loading="lazy"
    allowfullscreen
    style:width="100%"
    style:aspect-ratio={embedAspectRatio}
    style:min-height="200px"
    style:border="0"
  ></iframe>
</Frame>
```

The Svelte `Frame` waits until the browser is mounted and the category is
allowed. Its default placeholder opens preferences. Revocation removes the
iframe.

**JavaScript**

Use the shared browser helper below with your existing kernel. Put an
empty container where the embed should appear:

```html
<div id="consent-embed"></div>
```

In your browser entry point, after creating the kernel:

```ts
import { mountConsentEmbed } from './consent-embed';

const container = document.querySelector<HTMLElement>('#consent-embed');
if (!container) throw new Error('Missing consent embed container');

const disposeEmbed = mountConsentEmbed(container, kernel, openPreferences);
```

`kernel` is the instance from your quickstart. `openPreferences` is your
application's function for showing its consent preferences UI. Call
`disposeEmbed()` when the page or component is destroyed. The helper observes
both the current snapshot and later changes.

## Browser helper for Astro and JavaScript

Only the Astro and JavaScript examples need this helper. It creates the iframe
when permission allows it, keeps an existing player mounted across unrelated
snapshot updates, and removes it on revocation.

```ts title="src/consent-embed.ts"
import type { ConsentKernel } from 'c15t';
import { embedCategory, embedURL, embedTitle, embedAspectRatio } from './embed-config';

export function mountConsentEmbed(
  container: HTMLElement,
  kernel: ConsentKernel,
  openPreferences: () => void,
) {
  const render = () => {
    if (kernel.getSnapshot().effectivePermissions[embedCategory]) {
      if (container.querySelector('iframe')) return;
      const frame = document.createElement('iframe');
      frame.src = embedURL;
      frame.title = embedTitle;
      frame.loading = 'lazy';
      frame.allowFullscreen = true;
      Object.assign(frame.style, {
        width: '100%',
        aspectRatio: embedAspectRatio,
        minHeight: '200px',
        border: '0',
      });
      container.replaceChildren(frame);
    } else {
      if (container.querySelector('button')) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = 'Open privacy settings to view this content';
      button.onclick = openPreferences;
      container.replaceChildren(button);
    }
  };

  render();
  const unsubscribe = kernel.subscribe(render);
  return () => {
    unsubscribe();
    container.replaceChildren();
  };
}
```

Keep a transcript, address or other useful alternative outside the embed.
`loading="lazy"` is a performance hint; the consent condition controls whether
the iframe exists at all. A denied category may be fixed by policy, so opening
preferences does not guarantee that the visitor can grant it.

## Verify before and after permission

On a fresh opt-in session, inspect Network and confirm the iframe has not
requested the map. Grant the category and confirm the map mounts. Revoke it and
check the frame returns to its blocked state. Keep useful fallback information,
such as the address and directions link, available outside the map.

For a JavaScript Maps SDK instead of an iframe, register a category-gated script
and manage the widget's cleanup. Do not use this iframe recipe as evidence that
an independently loaded Maps SDK is blocked.
