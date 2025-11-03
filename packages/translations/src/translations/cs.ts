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
};
export default translations;
