import type { CompleteTranslations } from '../types';
export const translations: CompleteTranslations = {
	common: {
		acceptAll: 'Godta alle',
		rejectAll: 'Avvis alle',
		customize: 'Tilpass',
		save: 'Lagre innstillingar',
	},
	cookieBanner: {
		title: 'Vi verdset personvernet ditt',
		description:
			'Denne nettstaden brukar informasjonskapslar for å forbetre nettopplevinga di, analysere nettstadtrafikk og vise personleg tilpassa innhald.',
	},
	consentManagerDialog: {
		title: 'Personverninnstillingar',
		description:
			'Tilpass personverninnstillingane dine her. Du kan velje kva typar informasjonskapslar og sporingsteknologiar du tillèt.',
	},
	consentTypes: {
		necessary: {
			title: 'Strengt nødvendige',
			description:
				'Desse informasjonskapslane er nødvendige for at nettstaden skal fungere riktig og kan ikkje deaktiverast.',
		},
		functionality: {
			title: 'Funksjonalitet',
			description:
				'Desse informasjonskapslane gjer det mogleg med forbetra funksjonalitet og personleggjering av nettstaden.',
		},
		marketing: {
			title: 'Marknadsføring',
			description:
				'Desse informasjonskapslane blir brukte til å levere relevante annonsar og spore effektiviteten deira.',
		},
		measurement: {
			title: 'Analyse',
			description:
				'Desse informasjonskapslane hjelper oss å forstå korleis besøkande samhandlar med nettstaden og forbetre ytinga.',
		},
		experience: {
			title: 'Oppleving',
			description:
				'Desse informasjonskapslane hjelper oss å gi ei betre brukaroppleving og teste nye funksjonar.',
		},
	},
	frame: {
		title: 'Godta {category}-samtykke for å sjå dette innhaldet.',
		actionButton: 'Aktiver {category}-samtykke',
	},
	legalLinks: {
		privacyPolicy: 'Personvernerklæring',
		cookiePolicy: 'Retningslinjer for informasjonskapslar',
		termsOfService: 'Brukarvilkår',
	},
};
export default translations;
