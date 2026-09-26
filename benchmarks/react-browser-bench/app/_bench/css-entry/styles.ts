/**
 * Component-CSS arm: only the stylesheets the consent banner renders, no
 * aggregate. Imported explicitly because `@c15t/ui` class maps are not
 * guaranteed to import their CSS. There is no public token stylesheet apart
 * from the aggregate, so the `banner-css` page passes the full default theme
 * and the provider writes the tokens inline.
 */
import '@c15t/ui/styles/components/consent-banner.css';
import '@c15t/ui/styles/components/consent-actions.css';
import '@c15t/ui/styles/components/button.css';
import '@c15t/ui/styles/components/legal-links.css';
import '@c15t/ui/styles/components/branding.css';
