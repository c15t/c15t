// #region docs:prerender title="src/routes/about/+page.ts"
// Build this page once as static HTML. The root layout's load skips
// `loadConsent` while building, so the browser resolves consent here.
export const prerender = true;
// #endregion docs:prerender
