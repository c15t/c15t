---
title: Connect third-party services
description: Choose a vendor helper, understand its consent behavior and remove
  duplicate loading.
group: integrations
---

## Choose the integration by behavior

Install `@c15t/scripts` and pass the returned script configurations to your
framework provider or core script loader. The helper's return value is a
configuration; importing it alone does not register the vendor.

| Service                                       | Helper                | Loading contract                           |
| --------------------------------------------- | --------------------- | ------------------------------------------ |
| [Meta Pixel](./meta-pixel.md)                 | `metaPixel`           | Marketing permission                       |
| [Intercom](./intercom.md)                     | `intercom`            | Functionality permission                   |
| [Google Tag Manager](./google-tag-manager.md) | `googleTagManager`    | Always loaded, sends Consent Mode signals  |
| [Google Tag](./google-tag.md)                 | `gtag`                | Always loaded, sends Consent Mode signals  |
| [Google Maps embed](./google-maps.md)         | Consent-gated `Frame` | Children mount after the chosen permission |

The package also contains other vendor helpers. Check the installed package's
exports for the exact subpath and options before writing a custom loader. Do
not assume every helper blocks its SDK until consent; some load the SDK and
control its behavior through a consent API.

## Remove the original vendor installation

Find direct script tags, tag-manager entries, framework plugins and existing
SDK initializers. Keep one owner. Installing a helper while leaving the old
snippet in place can send requests before c15t is ready and initialize a vendor
twice.

## Verify the entire vendor lifecycle

Test no choice, rejection, acceptance, revocation and navigation. Stop future
event calls when permission becomes denied. Removing a script tag cannot undo
requests or event listeners already created by the vendor.

Use [custom integrations](./building-integrations.md) for an
unlisted service and [verification](../guides/verify-consent.md) to establish
what the browser actually sends.
