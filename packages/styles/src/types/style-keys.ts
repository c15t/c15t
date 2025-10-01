import type { ConsentManagerDialogTheme } from '../components/consent-manager-dialog/keys';
import type { ConsentManagerWidgetTheme } from '../components/consent-manager-widget/keys';
import type { CookieBannerTheme } from '../components/cookie-banner/keys';
import type { AccordionStylesKeys } from '../primitives/accordion/keys';

import type { SwitchStylesKeys } from '../primitives/switch/keys';
import type { ThemeValue } from './style-types';

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
