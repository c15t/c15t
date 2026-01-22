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
	iab: {
		banner: {
			title: 'Nastavenia súkromia',
			description:
				'My a naši {partnerCount} partneri ukladáme a/alebo pristupujeme k informáciám vo vašom zariadení a spracúvame osobné údaje, ako sú jedinečné identifikátory a údaje o prehliadaní, pre túto webovú stránku s cieľom:',
			partnersLink: '{count} partneri',
			andMore: 'A ďalších {count}...',
			legitimateInterestNotice:
				'Niektorí partneri si uplatňujú oprávnený záujem na spracúvanie vašich údajov. Máte právo vzniesť námietku proti tomuto spracúvaniu, prispôsobiť svoje voľby a kedykoľvek odvolať svoj súhlas.',
		},
		preferenceCenter: {
			title: 'Nastavenia súkromia',
			description:
				'Prispôsobte si nastavenia súkromia tu. Môžete si vybrať, ktoré typy cookies a sledovacích technológií povolíte.',
			tabs: {
				purposes: 'Účely',
				vendors: 'Dodávatelia',
			},
			purposeItem: {
				partners: '{count} partneri',
				vendorsUseLegitimateInterest:
					'{count} dodávatelia si uplatňujú oprávnený záujem',
				examples: 'Príklady',
				partnersUsingPurpose: 'Partneri využívajúci tento účel',
				withYourPermission: 'S vaším povolením',
				legitimateInterest: 'Oprávnený záujem',
				objectButton: 'Vzniesť námietku',
				objected: 'Námietka vznesená',
				rightToObject:
					'Máte právo vzniesť námietku proti spracúvaniu založenému na oprávnenom záujme.',
			},
			specialPurposes: {
				title: 'Základné funkcie (povinné)',
				tooltip:
					'Tieto sú potrebné pre funkčnosť a bezpečnosť stránky. Podľa IAB TCF nemôžete vzniesť námietku proti týmto osobitným účelom.',
			},
			vendorList: {
				search: 'Hľadať dodávateľov...',
				showingCount: 'Zobrazuje sa {filtered} z {total} dodávateľov',
				iabVendorsHeading: 'Dodávatelia registrovaní v IAB',
				iabVendorsNotice:
					'Títo partneri sú registrovaní v rámci IAB Transparency & Consent Framework (TCF), priemyselného štandardu pre správu súhlasu',
				customVendorsHeading: 'Vlastní partneri',
				customVendorsNotice:
					'Toto sú vlastní partneri, ktorí nie sú registrovaní v rámci IAB Transparency & Consent Framework (TCF). Spracúvajú údaje na základe vášho súhlasu a môžu mať iné postupy ochrany súkromia ako dodávatelia registrovaní v IAB.',
				purposes: 'Účely',
				specialPurposes: 'Osobitné účely',
				specialFeatures: 'Osobitné funkcie',
				dataCategories: 'Kategórie údajov',
				usesCookies: 'Používa cookies',
				nonCookieAccess: 'Prístup bez cookies',
				maxAge: 'Max. vek: {days}d',
				legitimateInterest: 'Opráv. záujem',
				privacyPolicy: 'Zásady ochrany súkromia',
				storageDisclosure: 'Zverejnenie informácií o ukladaní',
				requiredNotice: 'Vyžaduje sa pre funkčnosť stránky, nemožno zakázať',
			},
			footer: {
				consentStorage:
					'Predvoľby súhlasu sú uložené v cookie s názvom "euconsent-v2" po dobu 13 mesiacov.',
			},
		},
		common: {
			acceptAll: 'Prijať všetko',
			rejectAll: 'Odmietnuť všetko',
			customize: 'Prispôsobiť',
			saveSettings: 'Uložiť nastavenia',
			loading: 'Načítava sa...',
			showingSelectedVendor: 'Zobrazenie vybraného dodávateľa',
			clearSelection: 'Vymazať',
			customPartner: 'Vlastný partner neregistrovaný v IAB',
		},
	},
};
export default translations;
