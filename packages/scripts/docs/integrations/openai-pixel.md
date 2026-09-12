---
title: OpenAI Pixel
description: Measure ChatGPT Ads conversions after marketing consent with the
  OpenAI Measurement Pixel.
group: integrations
---

## Usage

```ts
import { openaiPixel } from '@c15t/scripts/openai-pixel';

const scripts = [
  openaiPixel({
    pixelId: 'YOUR_PIXEL_ID',
    debug: true,
  }),
];
```

Pass this array to your c15t script loader or framework provider's `scripts`
option. Copy your Pixel ID from the conversions tab in OpenAI Ads Manager.
Turn off `debug` after testing.

Remove the standalone OpenAI installation snippet when using this integration.
c15t creates the `oaiq` queue, initializes the pixel, and loads the SDK.

## Consent behavior

c15t loads the SDK only after the visitor grants `marketing` consent.
`measurement` consent alone does not enable this advertising pixel.

Before the SDK loads, c15t queues these commands in order:

```js
oaiq('consent', false);
oaiq('init', { pixelId: 'YOUR_PIXEL_ID', debug: false });
oaiq('consent', true);
```

The initial denial overrides the SDK's default consent of `true`. Once loaded,
the SDK stays on the page. c15t calls `oaiq('consent', false)` when marketing
consent is withdrawn and `oaiq('consent', true)` when it is granted again.
Re-granting consent does not reload or reinitialize the pixel.

OpenAI documents that denied measurement events are dropped and are not replayed
when consent returns. Consent denial does not unload the SDK or promise to erase
existing attribution cookies. The SDK can still send diagnostic pings while
measurement consent is denied.

## Options

| Option      | Type              | Default                                     | Description                                        |
| ----------- | ----------------- | ------------------------------------------- | -------------------------------------------------- |
| `pixelId`   | `string`          | Required                                    | Your OpenAI Ads Manager Pixel ID.                  |
| `debug`     | `boolean`         | `false`                                     | Log SDK activity to the browser console.           |
| `user`      | `OpenAIPixelUser` | Omitted                                     | User matching fields passed to SDK initialization. |
| `scriptSrc` | `string`          | `https://bzrcdn.openai.com/sdk/oaiq.min.js` | Override the SDK URL.                              |

## User matching

Pass `user` to `openaiPixel` to include customer matching data at initialization.
All fields are optional:

* `email_sha256`, `phone_number_sha256`, `external_id_sha256`,
  `first_name_sha256`, and `last_name_sha256` accept normalized SHA-256 hashes.
* `country`, `city`, `region`, and `postal_code` accept location strings.

```ts
openaiPixel({
  pixelId: 'YOUR_PIXEL_ID',
  user: { country: 'US', region: 'California', postal_code: '94107' },
});
```

Normalize identifiers according to OpenAI's
[user data rules](https://developers.openai.com/ads/measurement-pixel#send-user-data),
then hash them as lowercase, 64-character SHA-256 hex strings. c15t forwards these
values unchanged. It does not normalize or hash identifiers for you.

If user data becomes available after initialization, pass the complete updated
object through `window.oaiq?.('init', { pixelId: 'YOUR_PIXEL_ID', user })`.
User data belongs on `init`, not on individual conversion events. Automatic
advanced matching is configured by OpenAI; it is not an additional SDK init option.

## Send conversions

Installing the pixel does not send a conversion. Call `openaiPixelEvent` when
an action happens. This example sends an order value of $25.99:

```ts
import { openaiPixelEvent } from '@c15t/scripts/openai-pixel';

openaiPixelEvent(
  'order_created',
  { type: 'contents', amount: 2599, currency: 'USD' },
  { event_id: 'order_123', opt_out: true },
);
```

The helper supports every documented browser event and its corresponding data
shape. The optional fourth argument to the SDK, passed as the helper's third
argument, supports `event_id` for browser/server deduplication and `opt_out` for
opting an event out of future user-level personalization.

The queue does not exist before the first marketing consent grant unless another
script created it. Calls to `openaiPixelEvent` at that point are dropped. Once
the SDK loads, it applies the consent state supplied by c15t. The integration
does not add its own page-view event. Send `page_viewed` explicitly when needed.

`window.oaiq` is also typed for `init`, `consent`, `measure`, and `measureSingle`.
The event helper uses `measure`, which sends to every initialized pixel. To target
one initialized pixel, use:

```ts
window.oaiq?.(
  'measureSingle',
  'YOUR_PIXEL_ID',
  'page_viewed',
  { type: 'contents' },
);
```

See OpenAI's [supported events](https://developers.openai.com/ads/supported-events)
for payload fields. `app_installed` and `app_opened` require the Conversions API
and are not supported by the browser pixel.

## Test event delivery

After granting marketing consent, send a clearly named custom event:

```ts
import { openaiPixelEvent } from '@c15t/scripts/openai-pixel';

openaiPixelEvent(
  'custom',
  { type: 'custom' },
  {
    custom_event_name: 'c15t_integration_test',
    event_id: crypto.randomUUID(),
    opt_out: true,
  },
);
```

Custom events require `custom_event_name`. Open Event Stream in Ads Manager and
look for that name. With `debug: true`, the browser console shows whether the SDK
queued or dropped the event. In the Network panel, inspect requests to
`https://bzr.openai.com/v1/sdk/events` and check the response status. An accepted
request confirms transport; it does not confirm attribution to a ChatGPT ad.

The c15t live vendor monitor checks consent gating, the queue, the real SDK
response, and runtime initialization. It uses a placeholder Pixel ID and blocks
measurement requests, so monitor runs do not populate your Ads Manager events.

## Content Security Policy

If your site uses a Content Security Policy, allow these sources in the
corresponding directives:

| Directive     | Sources                                                  |
| ------------- | -------------------------------------------------------- |
| `script-src`  | `https://bzrcdn.openai.com`                              |
| `connect-src` | `https://bzr.openai.com` and `https://bzrcdn.openai.com` |
| `img-src`     | `https://bzr.openai.com`                                 |

Also allow the CDN in `script-src-elem` if your policy defines that directive.
