---
title: Google Maps
description: Render Google Maps only after consent with one shared Maps
  JavaScript API loader and independently managed map instances.
icon: google-maps
group: integrations
---
`GoogleMap` is a renderable integration for React and Next.js. It keeps the
Google Maps JavaScript API off the page until the configured consent category is
allowed, then loads the SDK once and creates a map for each mounted component.

Unlike the helpers from `@c15t/scripts`, `GoogleMap` owns both the consent-aware
script lifecycle and the visible map container.

> ℹ️ **Info:**
> The browser must receive a Google Maps API key, so the key is visible to site visitors. Keep it out of source control, use a key created for browser use, and restrict it by website and API in Google Cloud.

## Integrate with c15t

`GoogleMap` must render inside a `ConsentManagerProvider`. Complete the
[React quickstart](/docs/frameworks/react/quickstart) or
[Next.js quickstart](/docs/frameworks/next/quickstart) first.

**React**

```tsx
import { GoogleMap } from '@c15t/react';

const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

export function StoreMap() {
  if (!apiKey) {
    return <p>Google Maps is not configured.</p>;
  }

  return (
    <GoogleMap
      apiKey={apiKey}
      authReferrerPolicy="origin"
      center={{ lat: 40.7128, lng: -74.006 }}
      consentCategory="measurement"
      style={{ height: 400 }}
      zoom={12}
    />
  );
}
```

**Next.js**

```tsx
'use client';

import { GoogleMap } from '@c15t/nextjs';

const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export function StoreMap() {
  if (!apiKey) {
    return <p>Google Maps is not configured.</p>;
  }

  return (
    <GoogleMap
      apiKey={apiKey}
      authReferrerPolicy="origin"
      center={{ lat: 40.7128, lng: -74.006 }}
      consentCategory="measurement"
      style={{ height: 400 }}
      zoom={12}
    />
  );
}
```

`measurement` is a common choice for an interactive map, but the correct
category depends on why your application uses Google Maps and the policy shown
to your users.

## How c15t loads it

* **Before consent:** no Maps JavaScript API script is requested and no map
  instance is created.
* **After consent:** c15t registers one shared SDK loader and waits for Google's
  callback before constructing the map.
* **Multiple maps:** components with the same `scriptId` reuse the SDK while
  keeping separate map instances.
* **On revocation or unmount:** the component clears the map instance and its
  listeners. The page-level SDK registration is retained after its first load
  because Google supports one loader per page.
* **Existing SDK:** if another part of the application already loaded a
  compatible Google Maps global, the component adopts it instead of adding a
  duplicate script.
* **Visible states:** the blocked, loading, and error states are accessible and
  use the active c15t translations by default.

Keep one `scriptId` and one loader configuration across the page. Override the
default `scriptId` only to coordinate with a known c15t script registration, not
to load a second Maps SDK configuration. If two maps register conflicting
loader options, c15t reports the conflict and tells you to align the key,
language, region, libraries, and other loader options. A different `scriptId`
does not make a second Google loader safe.

## Configure the map

Pass `center`, `zoom`, `mapId`, and `options` as you would when constructing a
Google map:

```tsx
<GoogleMap
  apiKey={apiKey}
  center={{ lat: 51.5072, lng: -0.1276 }}
  consentCategory="measurement"
  mapId="YOUR_MAP_ID"
  options={{
    disableDefaultUI: true,
    gestureHandling: 'cooperative',
  }}
  zoom={11}
/>
```

Changes to `center`, `zoom`, and updateable `options` are applied to the existing
map. Changing `mapId` recreates it because Google treats that value as
construction-time configuration.

The component has a default height of `320px`. Override `style.height` or apply
a class with an explicit height when your layout needs another size.

### Loader options

The direct Maps JavaScript API loader options are available as component props:

* `libraries`
* `language`
* `region`
* `version`
* `authReferrerPolicy`
* `mapIds`
* `channel`
* `solutionChannel`
* `nonce`

`mapIds` preloads map ID configuration; `mapId` selects the map ID for the
component instance.

## Handle loading and errors

The built-in loading and error states use `frame.loading` and `frame.error` from
your c15t messages. The consent placeholder uses the localized consent-type
title in both its message and button—for example, an `Analytics` title produces
“Enable Analytics consent.”

Use the fallback props when you need integration-specific content and `onError`
for reporting:

```tsx
import { Frame, GoogleMap } from '@c15t/react';

function reportMapError(error: Error) {
  // Send the error to your observability provider.
}

<GoogleMap
  apiKey={apiKey}
  center={{ lat: 40.7128, lng: -74.006 }}
  consentCategory="measurement"
  loadingFallback={<p>Loading map…</p>}
  errorFallback={<p>The map could not be loaded.</p>}
  onError={reportMapError}
  placeholder={
    <Frame.Root>
      <Frame.Title>Allow measurement consent to view this map.</Frame.Title>
      <Frame.Button category="measurement" />
    </Frame.Root>
  }
/>
```

`onError` covers loader failures, timeouts, map-constructor failures, and
Google's global authentication failure callback. Authentication failures
usually indicate an invalid key, missing billing, a disabled API, or a referrer
that is not allowed.

If you provide a custom `placeholder`, include `Frame.Button` or another way to
reopen consent preferences or grant the required category.

### Retry a failed map

Increment `retryKey` to retry the same map after a loader, authentication, or
constructor failure:

```tsx
import { GoogleMap } from '@c15t/react';
import { useState } from 'react';

function RetryableMap({ apiKey }: { apiKey: string }) {
  const [retryKey, setRetryKey] = useState(0);

  return (
    <>
      <GoogleMap
        apiKey={apiKey}
        center={{ lat: 40.7128, lng: -74.006 }}
        retryKey={retryKey}
      />

      <button type="button" onClick={() => setRetryKey((key) => key + 1)}>
        Retry map
      </button>
    </>
  );
}
```

Changing `retryKey` clears the failed attempt and retries with the same
`scriptId`. A successful page-level SDK registration remains shared and is not
loaded again.

## Secure the browser key

For production:

1. Create a key specifically for the browser application.
2. Apply a **Websites** application restriction for every allowed development
   and production origin.
3. Restrict the key to the **Maps JavaScript API** and any additional APIs used
   by requested libraries.
4. Keep the value in an untracked environment file and expose it through the
   browser environment variable required by your framework.
5. Monitor key usage and rotate the key if you see unexpected traffic.

When `authReferrerPolicy="origin"` is set, configure origin-level website
restrictions without URL paths.

* [Google Maps Platform security guidance](https://developers.google.com/maps/api-security-best-practices)
* [Maps JavaScript API loader options](https://developers.google.com/maps/documentation/javascript/load-maps-js-api)
* [Maps Demo Key for local prototypes](https://developers.google.com/maps/documentation/javascript/demo-key)

## Verify setup

1. Clear saved consent and reload the page.
2. Confirm no request to `maps.googleapis.com/maps/api/js` occurs before the
   configured category is allowed.
3. Grant consent and confirm the map reaches its ready state.
4. Render two maps with the same `scriptId` and confirm only one loader script is
   added.
5. Revoke consent and confirm each map instance is removed.
6. Test a rejected key or referrer and confirm `errorFallback` and `onError`
   receive the failure.
7. Fix the rejected configuration, change `retryKey`, and confirm the map can
   recover without changing `scriptId`.

## Types

### GoogleMapProps

|Property|Type|Description|Default|Required|
|:--|:--|:--|:--|:--:|
|apiKey|string|Browser API key for the Google Maps JavaScript API.|-|✅ Required|
|center|google.maps.LatLngLiteral|Initial and controlled center of the map.|-|✅ Required|
|zoom|number \|undefined|Initial and controlled zoom level.|12|Optional|
|mapId|string \|undefined|Cloud map id. Changing this value recreates the map because Google treats&#xA;it as construction-time configuration.|-|Optional|
|options|Omit\<google.maps.MapOptions, "center" \|"zoom" \|"mapId"> \|undefined|Additional options passed to the Google Maps constructor.|-|Optional|
|consentCategory|AllConsentNames \|undefined|Consent category required before the Maps SDK loads.|'measurement'|Optional|
|libraries|GoogleMapsLibrary\[] \|undefined|Google Maps libraries to load with the shared page-level SDK.|-|Optional|
|language|string \|undefined|Language used by Maps controls and service responses.|-|Optional|
|region|string \|undefined|Two-character region code used for Maps localization and biasing.|-|Optional|
|version|string \|undefined|Google Maps JavaScript API version channel.|-|Optional|
|authReferrerPolicy|"origin" \|undefined|Limits referrer information sent to Google to the current origin.|-|Optional|
|channel|string \|undefined|Google Maps usage-tracking channel.|-|Optional|
|mapIds|string\[] \|undefined|Cloud map ids to preload with the Maps SDK.|-|Optional|
|solutionChannel|string \|undefined|Google Maps solution-channel identifier.|-|Optional|
|nonce|string \|undefined|CSP nonce applied to the Maps script registration.|-|Optional|
|scriptId|string \|undefined|Shared c15t script registration id.&#xA;&#xA;Keep this id and all loader options consistent across the page.|'c15t-google-maps'|Optional|
|timeoutMs|number \|undefined|Time to wait for the Maps readiness callback before reporting an error.|15000|Optional|
|retryKey|string \|number \|undefined|Change this value to retry a failed loader or map initialization.&#xA;Successful page-level loader registrations remain shared.|0|Optional|
|placeholder|ReactNode|Content shown before the configured consent category is allowed.|-|Optional|
|loadingFallback|ReactNode|Content shown while the Maps SDK or map instance is loading.|-|Optional|
|errorFallback|ReactNode|Content shown when configuration, loading, authentication, or setup fails.|-|Optional|
|onReady|((map: google.maps.Map, api: any) => void) \|undefined|Called when the map instance is ready.|-|Optional|
|onError|((error: Error) => void) \|undefined|Called when configuration, loading, authentication, or setup fails.|-|Optional|
