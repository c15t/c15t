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
[data-testid^="iab-consent-"] summary:focus-visible { outline: 2px solid var(--c15t-primary); outline-offset: 2px; }
[data-testid="iab-consent-dialog-root"] input[type="search"] { font-size: 16px; }
`;
