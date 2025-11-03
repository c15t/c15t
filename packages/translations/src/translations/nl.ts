import type { CompleteTranslations } from '../types';
export const translations: CompleteTranslations = {
	common: {
		acceptAll: 'Alles accepteren',
		rejectAll: 'Alles weigeren',
		customize: 'Aanpassen',
		save: 'Instellingen opslaan',
	},
	cookieBanner: {
		title: 'Wij hechten waarde aan uw privacy',
		description:
			'Deze site gebruikt cookies om uw surfervaring te verbeteren, het verkeer op de site te analyseren en gepersonaliseerde inhoud te tonen',
	},
	consentManagerDialog: {
		title: 'Privacy-instellingen',
		description:
			'Pas hier uw privacyinstellingen aan. U kunt kiezen welke soorten cookies en trackingtechnologieën u toestaat.',
	},
	consentTypes: {
		necessary: {
			title: 'Strikt noodzakelijk',
			description:
				'Deze cookies zijn essentieel voor het goed functioneren van de website en kunnen niet worden uitgeschakeld',
		},
		functionality: {
			title: 'Functionaliteit',
			description:
				'Deze cookies maken verbeterde functionaliteit en personalisatie van de website mogelijk.',
		},
		marketing: {
			title: 'Marketing',
			description:
				'Deze cookies worden gebruikt om relevante advertenties aan te bieden en de effectiviteit ervan bij te houden',
		},
		measurement: {
			title: 'Analytics',
			description:
				'Deze cookies helpen ons te begrijpen hoe bezoekers omgaan met de website en de prestaties ervan te verbeteren',
		},
		experience: {
			title: 'Ervaring',
			description:
				'Deze cookies helpen ons om een betere gebruikerservaring te bieden en nieuwe functies te testen',
		},
	},
	frame: {
		title: 'Accepteer {category} om deze inhoud te bekijken',
		actionButton: 'Schakel {category} toestemming in',
	},
};
export default translations;
