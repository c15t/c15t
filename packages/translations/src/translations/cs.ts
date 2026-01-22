import type { CompleteTranslations } from '../types';
export const translations: CompleteTranslations = {
	common: {
		acceptAll: 'Přijmout vše',
		rejectAll: 'Odmítnout vše',
		customize: 'Přizpůsobit',
		save: 'Uložit nastavení',
	},
	cookieBanner: {
		title: 'Vážíme si vašeho soukromí',
		description:
			'Tento web používá soubory cookie ke zlepšení vašeho prohlížení, analýze provozu na webu a zobrazování personalizovaného obsahu.',
	},
	consentManagerDialog: {
		title: 'Nastavení soukromí',
		description:
			'Zde si můžete přizpůsobit nastavení soukromí. Můžete zvolit, které typy souborů cookie a sledovacích technologií povolíte.',
	},
	consentTypes: {
		necessary: {
			title: 'Nezbytně nutné',
			description:
				'Tyto soubory cookie jsou nezbytné pro správné fungování webových stránek a nelze je deaktivovat.',
		},
		functionality: {
			title: 'Funkčnost',
			description:
				'Tyto soubory cookie umožňují rozšířenou funkčnost a personalizaci webových stránek.',
		},
		marketing: {
			title: 'Marketing',
			description:
				'Tyto soubory cookie se používají k doručování relevantních reklam a sledování jejich účinnosti.',
		},
		measurement: {
			title: 'Analytika',
			description:
				'Tyto soubory cookie nám pomáhají pochopit, jak návštěvníci interagují s webem a zlepšují jeho výkon.',
		},
		experience: {
			title: 'Uživatelská zkušenost',
			description:
				'Tyto soubory cookie nám pomáhají poskytovat lepší uživatelskou zkušenost a testovat nové funkce.',
		},
	},
	frame: {
		title:
			'Pro zobrazení tohoto obsahu přijměte souhlas s kategorií {category}.',
		actionButton: 'Povolit souhlas s kategorií {category}',
	},
	legalLinks: {
		privacyPolicy: 'Zásady ochrany osobních údajů',
		cookiePolicy: 'Zásady používání souborů cookie',
		termsOfService: 'Podmínky služby',
	},
	iab: {
		banner: {
			title: 'Nastavení soukromí',
			description:
				'My a našich {partnerCount} partnerů ukládáme a/nebo přistupujeme k informacím na vašem zařízení a zpracováváme osobní údaje, jako jsou jedinečné identifikátory a údaje o prohlížení, pro tento web za účelem:',
			partnersLink:
				'{count, plural, one {# partner} few {# partneři} other {# partnerů}}',
			andMore: 'A dalších {count}...',
			legitimateInterestNotice:
				'Někteří partneři uplatňují oprávněný zájem na zpracování vašich údajů. Máte právo proti tomuto zpracování vznést námitku, přizpůsobit své volby a kdykoli odvolat svůj souhlas.',
		},
		preferenceCenter: {
			title: 'Nastavení soukromí',
			description:
				'Zde si můžete přizpůsobit nastavení soukromí. Můžete zvolit, které typy souborů cookie a sledovacích technologií povolíte.',
			tabs: {
				purposes: 'Účely',
				vendors: 'Partneři',
			},
			purposeItem: {
				partners:
					'{count, plural, one {# partner} few {# partneři} other {# partnerů}}',
				vendorsUseLegitimateInterest:
					'{count, plural, one {# partner uplatňuje} few {# partneři uplatňují} other {# partnerů uplatňuje}} oprávněný zájem',
				examples: 'Příklady',
				partnersUsingPurpose: 'Partneři využívající tento účel',
				withYourPermission: 'S vaším svolením',
				legitimateInterest: 'Oprávněný zájem',
				objectButton: 'Vznést námitku',
				objected: 'Námitka vznesena',
				rightToObject:
					'Máte právo vznést námitku proti zpracování založenému na oprávněném zájmu.',
			},
			specialPurposes: {
				title: 'Základní funkce (povinné)',
				tooltip:
					'Tyto funkce jsou nezbytné pro funkčnost a zabezpečení webu. Podle IAB TCF nemůžete proti těmto zvláštním účelům vznést námitku.',
			},
			vendorList: {
				search: 'Hledat partnery...',
				showingCount:
					'{filtered} z {total, plural, one {# partnera} few {# partnerů} other {# partnerů}}',
				iabVendorsHeading: 'Partneři registrovaní v IAB',
				iabVendorsNotice:
					'Tito partneři jsou registrováni v rámci IAB Transparency & Consent Framework (TCF), což je průmyslový standard pro správu souhlasu',
				customVendorsHeading: 'Vlastní partneři',
				customVendorsNotice:
					'Toto jsou vlastní partneři, kteří nejsou registrováni v rámci IAB Transparency & Consent Framework (TCF). Zpracovávají data na základě vašeho souhlasu a mohou mít odlišné postupy ochrany osobních údajů než partneři registrovaní v IAB.',
				purposes: 'Účely',
				specialPurposes: 'Zvláštní účely',
				specialFeatures: 'Zvláštní funkce',
				dataCategories: 'Kategorie dat',
				usesCookies: 'Používá cookies',
				nonCookieAccess: 'Přístup bez cookies',
				maxAge: 'Maximální doba: {days} d',
				legitimateInterest: 'Oprávněný zájem',
				privacyPolicy: 'Zásady ochrany osobních údajů',
				storageDisclosure: 'Informace o ukládání',
				requiredNotice: 'Vyžadováno pro funkčnost webu, nelze zakázat',
			},
			footer: {
				consentStorage:
					'Předvolby souhlasu jsou uloženy v cookie s názvem "euconsent-v2" po dobu 13 měsíců.',
			},
		},
		common: {
			acceptAll: 'Přijmout vše',
			rejectAll: 'Odmítnout vše',
			customize: 'Přizpůsobit',
			saveSettings: 'Uložit nastavení',
			loading: 'Načítání...',
			showingSelectedVendor: 'Zobrazení vybraného partnera',
			clearSelection: 'Vymazat',
			customPartner: 'Vlastní partner neregistrovaný v IAB',
		},
	},
};
export default translations;
