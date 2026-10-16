# c15t with Shopify Hydrogen

A Next.js App Router store on mock.shop, built with Hydrogen's
framework-agnostic packages. It has a product grid, product pages with
variants, and a cart. Hydrogen's analytics wait for the c15t banner: each
choice goes to Shopify's Customer Privacy API, and page, product and cart
events go out only after the visitor has answered.

## Files

- `components/shopify-analytics.tsx`: the Shopify bridge from
  `@c15t/integrations/shopify`, fed by `useSnapshot()` and passed to
  `ShopifyScripts` as `consent.setup`.
- `c15t.config.ts`: declares the categories the bridge maps. c15t can't see
  Shopify's scripts, so without this the dialog offers only Necessary.
- `proxy.ts`: Hydrogen's `handleShopifyRoutes`. It serves the cart at
  `/api/cart` and the Storefront API at `/api/<version>/graphql.json`, where
  the Customer Privacy API saves each choice.
- `app/layout.tsx`: the shop details, the cart provider and the banner.
- `app/page.tsx`, `app/products/[handle]/page.tsx`, `app/cart/page.tsx`: the
  product grid, product page and cart.
- `components/page-view-tracker.tsx`, `components/product-details.tsx`: publish
  page and product views to Hydrogen's analytics.
- `lib/shop.ts`: the store domain, market and currency. mock.shop sells only
  in Canada, so the example uses CA and CAD. Replace them with your own.

## Run

```sh
bun install
bun run build:libs
bun run --cwd examples/shopify-nextjs dev
```

Open http://localhost:3104 with the Network panel open. Before you choose,
Hydrogen sends no analytics events and no `graphql.json` request carries
`visitorConsent`. Accept in the banner and the held product view goes out,
followed by an event for each page view and add to cart.

mock.shop accepts the consent request but sets no consent cookie, and Shopify
doesn't record analytics for it. Use a real shop to see events in Shopify.

The example connects to the public demo Inth project. Set
`NEXT_PUBLIC_C15T_BACKEND_URL` in `.env.local` to use your own.

See the [Shopify guide](https://c15t.com/docs/integrations/shopify).
