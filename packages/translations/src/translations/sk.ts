import type { CompleteTranslations } from '../types';
export const translations: CompleteTranslations = {
	common: {
		acceptAll: 'Prijať všetko',
		rejectAll: 'Odmietnuť všetko',
		customize: 'Prispôsobiť',
		save: 'Uložiť nastavenia',
	},
	cookieBanner: {
		title: 'Vážime si vaše súkromie',
		description:
			'Táto stránka používa cookies na zlepšenie vášho prehliadania, analýzu návštevnosti a zobrazovanie personalizovaného obsahu.',
	},
	consentManagerDialog: {
		title: 'Nastavenia súkromia',
		description:
			'Prispôsobte si nastavenia súkromia tu. Môžete si vybrať, ktoré typy cookies a sledovacích technológií povolíte.',
	},
	consentTypes: {
		necessary: {
			title: 'Nevyhnutné',
			description:
				'Tieto cookies sú nevyhnutné pre správne fungovanie webovej stránky a nemožno ich deaktivovať.',
		},
		functionality: {
			title: 'Funkčnosť',
			description:
				'Tieto cookies umožňujú rozšírenú funkčnosť a personalizáciu webovej stránky.',
		},
		marketing: {
			title: 'Marketing',
			description:
				'Tieto cookies sa používajú na doručovanie relevantných reklám a sledovanie ich účinnosti.',
		},
		measurement: {
			title: 'Analytika',
			description:
				'Tieto cookies nám pomáhajú pochopiť, ako návštevníci interagujú s webovou stránkou a zlepšiť jej výkon.',
		},
		experience: {
			title: 'Používateľská skúsenosť',
			description:
				'Tieto cookies nám pomáhajú poskytovať lepšiu používateľskú skúsenosť a testovať nové funkcie.',
		},
	},
	frame: {
		title:
			'Prijmite súhlas pre kategóriu {category} na zobrazenie tohto obsahu.',
		actionButton: 'Povoliť súhlas pre {category}',
	},
	legalLinks: {
		privacyPolicy: 'Zásady ochrany osobných údajov',
		cookiePolicy: 'Zásady používania súborov cookie',
		termsOfService: 'Podmienky používania služby',
	},
};
export default translations;
