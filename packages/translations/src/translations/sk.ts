import type { CompleteTranslations } from '../types';

export const translations: CompleteTranslations = {
	common: {
		acceptAll: 'Prijať všetko',
		close: 'Zavrieť',
		customize: 'Prispôsobiť',
		rejectAll: 'Odmietnuť všetko',
		save: 'Uložiť nastavenia',
		securedBy: 'Zabezpečuje',
	},
	consentManagerDialog: {
		description:
			'Prispôsobte si nastavenia súkromia tu. Môžete si vybrať, ktoré typy cookies a sledovacích technológií povolíte.',
		title: 'Nastavenia súkromia',
	},
	consentTypes: {
		experience: {
			description:
				'Tieto cookies nám pomáhajú poskytovať lepšiu používateľskú skúsenosť a testovať nové funkcie.',
			title: 'Používateľská skúsenosť',
		},
		functionality: {
			description:
				'Tieto cookies umožňujú rozšírenú funkčnosť a personalizáciu webovej stránky.',
			title: 'Funkčnosť',
		},
		marketing: {
			description:
				'Tieto cookies sa používajú na doručovanie relevantných reklám a sledovanie ich účinnosti.',
			title: 'Marketing',
		},
		measurement: {
			description:
				'Tieto cookies nám pomáhajú pochopiť, ako návštevníci interagujú s webovou stránkou a zlepšiť jej výkon.',
			title: 'Analytika',
		},
		necessary: {
			description:
				'Tieto cookies sú nevyhnutné pre správne fungovanie webovej stránky a nemožno ich deaktivovať.',
			title: 'Nevyhnutné',
		},
	},
	cookieBanner: {
		description:
			'Táto stránka používa cookies na zlepšenie vášho prehliadania, analýzu návštevnosti a zobrazovanie personalizovaného obsahu.',
		title: 'Vážime si vaše súkromie',
	},
	frame: {
		actionButton: 'Povoliť súhlas pre {category}',
		error: 'This content could not be loaded.',
		loading: 'Loading content…',
		policyBlocked:
			"This content is unavailable under your region's consent policy.",
		title:
			'Prijmite súhlas pre kategóriu {category} na zobrazenie tohto obsahu.',
	},
	iab: {
		banner: {
			andMore: 'A ďalších {count}...',
			description:
				'My a naši {partnerCount} partneri ukladáme a/alebo pristupujeme k informáciám vo vašom zariadení a spracúvame osobné údaje, ako sú jedinečné identifikátory a údaje o prehliadaní, pre túto webovú stránku s cieľom:',
			legitimateInterestNotice:
				'Niektorí partneri si uplatňujú oprávnený záujem na spracúvanie vašich údajov. Máte právo vzniesť námietku proti tomuto spracúvaniu, prispôsobiť svoje voľby a kedykoľvek odvolať svoj súhlas.',
			partnersLink: '{count} partneri',
			scopeGroup: 'Vaša voľba platí pre všetky naše weby v tejto skupine.',
			scopeServiceSpecific:
				'Váš súhlas platí len pre túto webovú stránku a neovplyvní iné služby.',
			title: 'Nastavenia súkromia',
		},
		common: {
			acceptAll: 'Prijať všetko',
			clearSelection: 'Vymazať',
			customPartner: 'Vlastný partner neregistrovaný v IAB',
			customize: 'Prispôsobiť',
			loading: 'Načítava sa...',
			rejectAll: 'Odmietnuť všetko',
			saveSettings: 'Uložiť nastavenia',
			showingSelectedVendor: 'Zobrazenie vybraného dodávateľa',
		},
		preferenceCenter: {
			description:
				'Prispôsobte si nastavenia súkromia tu. Môžete si vybrať, ktoré typy cookies a sledovacích technológií povolíte.',
			footer: {
				consentStorage:
					'Predvoľby súhlasu sú uložené v cookie s názvom "euconsent-v2" po dobu 13 mesiacov. Doba uloženia sa môže obnoviť, keď aktualizujete svoje predvoľby.',
			},
			purposeItem: {
				examples: 'Príklady',
				legitimateInterest: 'Oprávnený záujem',
				objectButton: 'Vzniesť námietku',
				objected: 'Námietka vznesená',
				partners: '{count} partneri',
				partnersUsingPurpose: 'Partneri využívajúci tento účel',
				rightToObject:
					'Máte právo vzniesť námietku proti spracúvaniu založenému na oprávnenom záujme.',
				vendorsUseLegitimateInterest:
					'{count} dodávatelia si uplatňujú oprávnený záujem',
				withYourPermission: 'S vaším povolením',
			},
			specialPurposes: {
				title: 'Základné funkcie (povinné)',
				tooltip:
					'Tieto sú potrebné pre funkčnosť a bezpečnosť stránky. Podľa IAB TCF nemôžete vzniesť námietku proti týmto osobitným účelom.',
			},
			tabs: {
				purposes: 'Účely',
				vendors: 'Dodávatelia',
			},
			title: 'Nastavenia súkromia',
			vendorList: {
				customVendorsHeading: 'Vlastní partneri',
				customVendorsNotice:
					'Toto sú vlastní partneri, ktorí nie sú registrovaní v rámci IAB Transparency & Consent Framework (TCF). Spracúvajú údaje na základe vášho súhlasu a môžu mať iné postupy ochrany súkromia ako dodávatelia registrovaní v IAB.',
				dataCategories: 'Kategórie údajov',
				features: 'Funkcie',
				iabVendorsHeading: 'Dodávatelia registrovaní v IAB',
				iabVendorsNotice:
					'Títo partneri sú registrovaní v rámci IAB Transparency & Consent Framework (TCF), priemyselného štandardu pre správu súhlasu',
				legitimateInterest: 'Opráv. záujem',
				maxAge: 'Max. vek: {days}d',
				nonCookieAccess: 'Prístup bez cookies',
				privacyPolicy: 'Zásady ochrany súkromia',
				purposes: 'Účely',
				requiredNotice: 'Vyžaduje sa pre funkčnosť stránky, nemožno zakázať',
				retention: 'Uchovávanie: {days}d',
				search: 'Hľadať dodávateľov...',
				showingCount: 'Zobrazuje sa {filtered} z {total} dodávateľov',
				specialFeatures: 'Osobitné funkcie',
				specialPurposes: 'Osobitné účely',
				storageDisclosure: 'Zverejnenie informácií o ukladaní',
				usesCookies: 'Používa cookies',
			},
		},
	},
	legalLinks: {
		cookiePolicy: 'Zásady používania súborov cookie',
		privacyPolicy: 'Zásady ochrany osobných údajov',
		termsOfService: 'Podmienky používania služby',
	},
};
export default translations;
