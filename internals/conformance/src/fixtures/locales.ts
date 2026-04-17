/**
 * Locale fixtures for the i18n conformance matrix.
 *
 * Each locale targets a real risk:
 * - `en` — baseline LTR
 * - `ar` — RTL; verifies `dir="rtl"` propagation & mirrored layouts
 * - `de` — long compound words; verifies no layout overflow regressions
 */

export type LocaleFixture = {
	code: string;
	direction: 'ltr' | 'rtl';
	translations: {
		banner: {
			title: string;
			description: string;
			acceptAll: string;
			rejectAll: string;
			customize: string;
		};
	};
};

export const LOCALE_FIXTURES: readonly LocaleFixture[] = [
	{
		code: 'en',
		direction: 'ltr',
		translations: {
			banner: {
				title: 'We value your privacy',
				description: 'We use cookies to enhance your experience.',
				acceptAll: 'Accept all',
				rejectAll: 'Reject all',
				customize: 'Customize',
			},
		},
	},
	{
		code: 'ar',
		direction: 'rtl',
		translations: {
			banner: {
				title: 'نحن نقدر خصوصيتك',
				description: 'نستخدم ملفات تعريف الارتباط لتحسين تجربتك.',
				acceptAll: 'قبول الكل',
				rejectAll: 'رفض الكل',
				customize: 'تخصيص',
			},
		},
	},
	{
		code: 'de',
		direction: 'ltr',
		translations: {
			banner: {
				title: 'Datenschutzeinstellungen',
				description:
					'Wir verwenden Cookies und ähnliche Datenverarbeitungstechnologien, um Ihre Benutzererfahrung zu verbessern.',
				acceptAll: 'Alle akzeptieren',
				rejectAll: 'Alle ablehnen',
				customize: 'Einstellungen anpassen',
			},
		},
	},
] as const;

export const LOCALE_BY_CODE: Readonly<Record<string, LocaleFixture>> =
	Object.fromEntries(LOCALE_FIXTURES.map((l) => [l.code, l]));
