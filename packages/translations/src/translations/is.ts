import type { CompleteTranslations } from '../types';
export const translations: CompleteTranslations = {
	common: {
		acceptAll: 'Samþykkja allt',
		rejectAll: 'Hafna öllu',
		customize: 'Sérsníða',
		save: 'Vista stillingar',
	},
	cookieBanner: {
		title: 'Við metum friðhelgi þína',
		description:
			'Þessi vefur notar vafrakökur til að bæta vafraupplifun þína, greina umferð á vefnum og sýna persónumiðað efni.',
	},
	consentManagerDialog: {
		title: 'Persónuverndastillingar',
		description:
			'Sérsníðaðu persónuverndastillingar þínar hér. Þú getur valið hvaða tegundir af vafrakökum og rakningartækni þú leyfir.',
	},
	consentTypes: {
		necessary: {
			title: 'Nauðsynlegar',
			description:
				'Þessar vafrakökur eru nauðsynlegar til að vefsíðan virki rétt og ekki er hægt að slökkva á þeim.',
		},
		functionality: {
			title: 'Virkni',
			description:
				'Þessar vafrakökur gera mögulegt að auka virkni og persónumiða vefsíðuna.',
		},
		marketing: {
			title: 'Markaðssetning',
			description:
				'Þessar vafrakökur eru notaðar til að birta viðeigandi auglýsingar og fylgjast með árangri þeirra.',
		},
		measurement: {
			title: 'Greining',
			description:
				'Þessar vafrakökur hjálpa okkur að skilja hvernig gestir nota vefsíðuna og bæta frammistöðu hennar.',
		},
		experience: {
			title: 'Upplifun',
			description:
				'Þessar vafrakökur hjálpa okkur að veita betri notendaupplifun og prófa nýja eiginleika.',
		},
	},
	frame: {
		title: 'Samþykktu {category} samþykki til að skoða þetta efni.',
		actionButton: 'Virkja {category} samþykki',
	},
	legalLinks: {
		privacyPolicy: 'Persónuverndarstefna',
		cookiePolicy: 'Stefna um vafrakökur',
		termsOfService: 'Þjónustuskilmálar',
	},
};
export default translations;
