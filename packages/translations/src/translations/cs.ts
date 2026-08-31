import type { CompleteTranslations } from '../types';

export const translations: CompleteTranslations = {
	common: {
		acceptAll: 'Přijmout vše',
		close: 'Zavřít',
		customize: 'Přizpůsobit',
		rejectAll: 'Odmítnout vše',
		save: 'Uložit nastavení',
		securedBy: 'Zabezpečuje',
	},
	consentManagerDialog: {
		description:
			'Zde si můžete přizpůsobit nastavení soukromí. Můžete zvolit, které typy souborů cookie a sledovacích technologií povolíte.',
		title: 'Nastavení soukromí',
	},
	consentTypes: {
		experience: {
			description:
				'Tyto soubory cookie nám pomáhají poskytovat lepší uživatelskou zkušenost a testovat nové funkce.',
			title: 'Uživatelská zkušenost',
		},
		functionality: {
			description:
				'Tyto soubory cookie umožňují rozšířenou funkčnost a personalizaci webových stránek.',
			title: 'Funkčnost',
		},
		marketing: {
			description:
				'Tyto soubory cookie se používají k doručování relevantních reklam a sledování jejich účinnosti.',
			title: 'Marketing',
		},
		measurement: {
			description:
				'Tyto soubory cookie nám pomáhají pochopit, jak návštěvníci interagují s webem a zlepšují jeho výkon.',
			title: 'Analytika',
		},
		necessary: {
			description:
				'Tyto soubory cookie jsou nezbytné pro správné fungování webových stránek a nelze je deaktivovat.',
			title: 'Nezbytně nutné',
		},
	},
	cookieBanner: {
		description:
			'Tento web používá soubory cookie ke zlepšení vašeho prohlížení, analýze provozu na webu a zobrazování personalizovaného obsahu.',
		title: 'Vážíme si vašeho soukromí',
	},
	frame: {
		actionButton: 'Povolit souhlas s kategorií {category}',
		error: 'This content could not be loaded.',
		loading: 'Loading content…',
		policyBlocked:
			"This content is unavailable under your region's consent policy.",
		title:
			'Pro zobrazení tohoto obsahu přijměte souhlas s kategorií {category}.',
	},
	iab: {
		banner: {
			andMore: 'A dalších {count}...',
			description:
				'My a našich {partnerCount} partnerů ukládáme a/nebo přistupujeme k informacím na vašem zařízení a zpracováváme osobní údaje, jako jsou jedinečné identifikátory a údaje o prohlížení, pro tento web za účelem:',
			legitimateInterestNotice:
				'Někteří partneři uplatňují oprávněný zájem na zpracování vašich údajů. Máte právo proti tomuto zpracování vznést námitku, přizpůsobit své volby a kdykoli odvolat svůj souhlas.',
			partnersLink:
				'{count, plural, one {# partner} few {# partneři} other {# partnerů}}',
			scopeGroup: 'Vaše volba platí pro všechny naše weby v této skupině.',
			scopeServiceSpecific:
				'Váš souhlas platí pouze pro tento web a neovlivní jiné služby.',
			title: 'Nastavení soukromí',
		},
		common: {
			acceptAll: 'Přijmout vše',
			clearSelection: 'Vymazat',
			customPartner: 'Vlastní partner neregistrovaný v IAB',
			customize: 'Přizpůsobit',
			loading: 'Načítání...',
			rejectAll: 'Odmítnout vše',
			saveSettings: 'Uložit nastavení',
			showingSelectedVendor: 'Zobrazení vybraného partnera',
		},
		preferenceCenter: {
			description:
				'Zde si můžete přizpůsobit nastavení soukromí. Můžete zvolit, které typy souborů cookie a sledovacích technologií povolíte.',
			footer: {
				consentStorage:
					'Předvolby souhlasu jsou uloženy v cookie s názvem "euconsent-v2" po dobu 13 měsíců. Doba uložení se může obnovit, když aktualizujete své předvolby.',
			},
			purposeItem: {
				examples: 'Příklady',
				legitimateInterest: 'Oprávněný zájem',
				objectButton: 'Vznést námitku',
				objected: 'Námitka vznesena',
				partners:
					'{count, plural, one {# partner} few {# partneři} other {# partnerů}}',
				partnersUsingPurpose: 'Partneři využívající tento účel',
				rightToObject:
					'Máte právo vznést námitku proti zpracování založenému na oprávněném zájmu.',
				vendorsUseLegitimateInterest:
					'{count, plural, one {# partner uplatňuje} few {# partneři uplatňují} other {# partnerů uplatňuje}} oprávněný zájem',
				withYourPermission: 'S vaším svolením',
			},
			specialPurposes: {
				title: 'Základní funkce (povinné)',
				tooltip:
					'Tyto funkce jsou nezbytné pro funkčnost a zabezpečení webu. Podle IAB TCF nemůžete proti těmto zvláštním účelům vznést námitku.',
			},
			tabs: {
				purposes: 'Účely',
				vendors: 'Partneři',
			},
			title: 'Nastavení soukromí',
			vendorList: {
				customVendorsHeading: 'Vlastní partneři',
				customVendorsNotice:
					'Toto jsou vlastní partneři, kteří nejsou registrováni v rámci IAB Transparency & Consent Framework (TCF). Zpracovávají data na základě vašeho souhlasu a mohou mít odlišné postupy ochrany osobních údajů než partneři registrovaní v IAB.',
				dataCategories: 'Kategorie dat',
				features: 'Funkce',
				iabVendorsHeading: 'Partneři registrovaní v IAB',
				iabVendorsNotice:
					'Tito partneři jsou registrováni v rámci IAB Transparency & Consent Framework (TCF), což je průmyslový standard pro správu souhlasu',
				legitimateInterest: 'Oprávněný zájem',
				maxAge: 'Maximální doba: {days} d',
				nonCookieAccess: 'Přístup bez cookies',
				privacyPolicy: 'Zásady ochrany osobních údajů',
				purposes: 'Účely',
				requiredNotice: 'Vyžadováno pro funkčnost webu, nelze zakázat',
				retention: 'Uchovávání: {days} d',
				search: 'Hledat partnery...',
				showingCount:
					'{filtered} z {total, plural, one {# partnera} few {# partnerů} other {# partnerů}}',
				specialFeatures: 'Zvláštní funkce',
				specialPurposes: 'Zvláštní účely',
				storageDisclosure: 'Informace o ukládání',
				usesCookies: 'Používá cookies',
			},
		},
	},
	legalLinks: {
		cookiePolicy: 'Zásady používání souborů cookie',
		privacyPolicy: 'Zásady ochrany osobních údajů',
		termsOfService: 'Podmínky služby',
	},
};
export default translations;
