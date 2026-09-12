/** Native disclosure and touch-target adjustments for the IAB DOM adapter. */
export const adapterStyles = `
[data-testid="iab-consent-banner-root"], [data-testid="iab-consent-dialog-root"] { pointer-events: none; }
[data-testid="iab-consent-banner-card"], [data-testid="iab-consent-dialog-card"] { pointer-events: auto; }
[data-testid="iab-consent-banner-root"][data-variant="floating"][data-position^="top"] { align-items: flex-start; }
[data-testid="iab-consent-banner-root"][data-variant="floating"][data-position^="bottom"] { align-items: flex-end; }
[data-testid="iab-consent-banner-root"][data-variant="floating"][data-position$="left"] { justify-content: flex-start; }
[data-testid="iab-consent-banner-root"][data-variant="floating"][data-position$="right"] { justify-content: flex-end; }
[data-testid="iab-consent-banner-root"][data-variant="bar"] { --iab-consent-banner-max-width: 100%; align-items: flex-end; }
[data-testid="iab-consent-banner-root"][data-variant="bar"][data-position="top"] { align-items: flex-start; }
[data-testid="iab-consent-banner-card"] { max-height: calc(100dvh - 4rem); overflow-y: auto; }
[data-c15t-iab-disclosure] > summary { box-sizing: border-box; min-height: 44px; cursor: pointer; list-style: none; justify-content: flex-start; align-items: center; }
[data-c15t-iab-disclosure] > summary > :last-child { flex: 1; }
[data-c15t-iab-disclosure] > summary::-webkit-details-marker { display: none; }
[data-c15t-iab-chevron] { display: inline-block; color: var(--c15t-text-muted); }
[data-c15t-iab-disclosure][open] > summary [data-c15t-iab-chevron] { transform: rotate(90deg); }
[data-testid^="iab-consent-"] button { min-height: 44px; touch-action: manipulation; }
[data-c15t-iab-toggle] { width: 44px; height: 44px; padding: 12px 6px; }
[data-c15t-iab-vendor-details] { display: block; padding: 0 0.75rem 0.75rem; font-size: 0.875rem; line-height: 1.5; }
[data-c15t-iab-vendor-details] h3 { margin: 1rem 0 0.375rem; font-size: 0.875rem; font-weight: 600; }
[data-c15t-iab-vendor-details] p { margin: 0.5rem 0; }
[data-c15t-iab-vendor-details] ul { margin: 0.375rem 0; padding-inline-start: 1.25rem; }
[data-testid^="iab-consent-"] summary:focus-visible { outline: 2px solid var(--c15t-primary); outline-offset: 2px; }
[data-testid="iab-consent-dialog-root"] input[type="search"] { font-size: 16px; }
`;
