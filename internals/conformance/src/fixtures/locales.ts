/**
 * Locale fixtures for the i18n conformance matrix.
 *
 * Each locale targets a real risk:
 * - `en` — baseline LTR
 * - `ar` — RTL; verifies `dir="rtl"` propagation & mirrored layouts
 * - `de` — long compound words; verifies no layout overflow regressions
 */

export interface LocaleFixture {
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
}

export const LOCALE_FIXTURES: readonly LocaleFixture[] = [
	{
		code: 'en',
		direction: 'ltr',
		translations: {
			banner: {
				acceptAll: 'Accept all',
				customize: 'Customize',
				description: 'We use cookies to enhance your experience.',
				rejectAll: 'Reject all',
				title: 'We value your privacy',
			},
		},
	},
	{
		code: 'ar',
		direction: 'rtl',
		translations: {
			banner: {
				acceptAll: 'قبول الكل',
				customize: 'تخصيص',
				description: 'نستخدم ملفات تعريف الارتباط لتحسين تجربتك.',
				rejectAll: 'رفض الكل',
				title: 'نحن نقدر خصوصيتك',
			},
		},
	},
	{
		code: 'de',
		direction: 'ltr',
		translations: {
			banner: {
				acceptAll: 'Alle akzeptieren',
				customize: 'Einstellungen anpassen',
				description:
					'Wir verwenden Cookies und ähnliche Datenverarbeitungstechnologien, um Ihre Benutzererfahrung zu verbessern.',
				rejectAll: 'Alle ablehnen',
				title: 'Datenschutzeinstellungen',
			},
		},
	},
] as const;

export const LOCALE_BY_CODE: Readonly<Record<string, LocaleFixture>> =
	Object.fromEntries(LOCALE_FIXTURES.map((l) => [l.code, l]));
