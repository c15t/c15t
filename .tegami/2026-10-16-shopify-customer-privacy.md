---
packages:
  "@c15t/integrations":
    replay:
      - exit-prerelease(npm:@c15t/integrations)
---

### Send c15t consent to Shopify

`@c15t/integrations/shopify` adds `createShopifyCustomerPrivacy`, a bridge that
sends each c15t choice to Shopify's Customer Privacy API. Pass its `setup` to
Hydrogen's `ShopifyScripts` with `consent: { mode: 'custom-banner' }`, and
Hydrogen holds analytics events until the visitor has answered the c15t
banner. Under an opt-out policy, Shopify applies its region defaults until the
visitor saves a choice. See the
[Shopify guide](https://c15t.com/docs/integrations/shopify).
