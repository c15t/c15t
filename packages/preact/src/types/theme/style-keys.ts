import type { ConsentManagerDialogTheme } from '~/components/consent-manager-dialog/theme';
import type { ConsentManagerWidgetTheme } from '~/components/consent-manager-widget/theme';
import type { CookieBannerTheme } from '~/components/cookie-banner/theme';
import type { AccordionStylesKeys } from '~/components/shared/ui/accordion';
import type { SwitchStylesKeys } from '~/components/shared/ui/switch';
import type { ThemeValue } from '~/types/theme';

type NestedKeys<T> = {
	[K in keyof T & (string | number)]: T[K] extends object
		? `${K & string}` | `${K & string}.${NestedKeys<T[K]>}`
		: `${K & string}`;
}[keyof T & (string | number)];

export type AllThemeKeys =
	// elements
	| NestedKeys<CookieBannerTheme>
	| NestedKeys<ConsentManagerWidgetTheme>
	| NestedKeys<ConsentManagerDialogTheme>
	// primitives
	| NestedKeys<AccordionStylesKeys>
	| NestedKeys<SwitchStylesKeys>
	| NestedKeys<{ button: ThemeValue }>;
