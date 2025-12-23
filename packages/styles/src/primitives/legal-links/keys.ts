import type { ConsentManagerDialogTheme } from '../../components/consent-manager-dialog/keys';
import type { CookieBannerTheme } from '../../components/cookie-banner/keys';
export type LegalLinksThemeKey =
	| CookieBannerTheme['banner.header.legal-links']
	| ConsentManagerDialogTheme['dialog.legal-links'];
