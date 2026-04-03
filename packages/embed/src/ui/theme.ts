/**
 * Injects c15t theme CSS variables into the page.
 *
 * Uses the same CSS variable naming convention as @c15t/ui:
 * --c15t-primary, --c15t-surface, --c15t-text, etc.
 *
 * These variables are consumed by the consent banner/dialog CSS modules.
 */

const DEFAULT_THEME_CSS = `
:root {
  /* Colors */
  --c15t-primary: hsl(228, 100%, 60%);
  --c15t-primary-hover: hsl(228, 100%, 55%);
  --c15t-surface: hsl(0, 0%, 100%);
  --c15t-surface-hover: hsl(0, 0%, 98%);
  --c15t-border: hsl(0, 0%, 90%);
  --c15t-border-hover: hsl(0, 0%, 85%);
  --c15t-text: hsl(0, 0%, 10%);
  --c15t-text-muted: hsl(0, 0%, 40%);
  --c15t-text-on-primary: hsl(0, 0%, 100%);
  --c15t-overlay: hsla(0, 0%, 0%, 0.5);
  --c15t-switch-track: hsl(0, 0%, 85%);
  --c15t-switch-track-active: hsl(228, 100%, 60%);
  --c15t-switch-thumb: hsl(0, 0%, 100%);

  /* Typography */
  --c15t-font-family: system-ui, -apple-system, sans-serif;
  --c15t-font-size-sm: 0.875rem;
  --c15t-font-size-base: 1rem;
  --c15t-font-size-lg: 1.125rem;
  --c15t-font-weight-normal: 400;
  --c15t-font-weight-medium: 500;
  --c15t-font-weight-semibold: 600;
  --c15t-line-height-tight: 1.25;
  --c15t-line-height-normal: 1.5;
  --c15t-line-height-relaxed: 1.75;

  /* Spacing */
  --c15t-space-xs: 0.25rem;
  --c15t-space-sm: 0.5rem;
  --c15t-space-md: 1rem;
  --c15t-space-lg: 1.5rem;
  --c15t-space-xl: 2rem;

  /* Radii */
  --c15t-radius-sm: 0.375rem;
  --c15t-radius-md: 0.5rem;
  --c15t-radius-lg: 0.75rem;
  --c15t-radius-xl: 1rem;

  /* Shadows */
  --c15t-shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --c15t-shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
  --c15t-shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);

  /* Animation */
  --c15t-duration-fast: 150ms;
  --c15t-duration-normal: 250ms;
  --c15t-easing: cubic-bezier(0.4, 0, 0.2, 1);
}

@media (prefers-color-scheme: dark) {
  :root {
    --c15t-primary: hsl(228, 100%, 70%);
    --c15t-primary-hover: hsl(228, 100%, 65%);
    --c15t-surface: hsl(0, 0%, 7%);
    --c15t-surface-hover: hsl(0, 0%, 10%);
    --c15t-border: hsl(0, 0%, 20%);
    --c15t-border-hover: hsl(0, 0%, 25%);
    --c15t-text: hsl(0, 0%, 93%);
    --c15t-text-muted: hsl(0, 0%, 60%);
    --c15t-text-on-primary: hsl(0, 0%, 100%);
    --c15t-overlay: hsla(0, 0%, 0%, 0.7);
    --c15t-switch-track: hsl(0, 0%, 25%);
    --c15t-switch-track-active: hsl(228, 100%, 70%);
    --c15t-switch-thumb: hsl(0, 0%, 93%);
    --c15t-shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -4px rgba(0, 0, 0, 0.3);
  }
}
`.trim();

let injected = false;

/**
 * Injects the theme CSS into the page if not already present.
 */
export function injectThemeCSS(): void {
	if (injected) return;

	const style = document.createElement('style');
	style.id = 'c15t-embed-theme';
	style.textContent = DEFAULT_THEME_CSS;
	document.head.appendChild(style);
	injected = true;
}
