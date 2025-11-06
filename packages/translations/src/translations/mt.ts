import type { CompleteTranslations } from '../types';
export const translations: CompleteTranslations = {
	common: {
		acceptAll: 'Aċċetta kollox',
		rejectAll: 'Irrifjuta kollox',
		customize: 'Personalizza',
		save: 'Issejvja s-settings',
	},
	cookieBanner: {
		title: 'Napprezzaw il-privatezza tiegħek',
		description:
			'Dan is-sit juża cookies biex itejjeb l-esperjenza tal-browsing tiegħek, janalizza t-traffiku tas-sit, u juri kontenut personalizzat.',
	},
	consentManagerDialog: {
		title: 'Settings tal-privatezza',
		description:
			"Personalizza s-settings tal-privatezza tiegħek hawn. Tista' tagħżel liema tipi ta' cookies u teknoloġiji ta' traċċar tippermetti.",
	},
	consentTypes: {
		necessary: {
			title: 'Strettament neċessarji',
			description:
				'Dawn il-cookies huma essenzjali biex is-sit web jaħdem sew u ma jistgħux jiġu diżattivati.',
		},
		functionality: {
			title: 'Funzjonalità',
			description:
				'Dawn il-cookies jippermettu funzjonalità mtejba u personalizzazzjoni tas-sit web.',
		},
		marketing: {
			title: 'Marketing',
			description:
				'Dawn il-cookies jintużaw biex iwasslu riklami rilevanti u jittraċċaw l-effettività tagħhom.',
		},
		measurement: {
			title: 'Analitika',
			description:
				'Dawn il-cookies jgħinuna nifhmu kif il-viżitaturi jinteraġixxu mas-sit web u ntejbu l-prestazzjoni tiegħu.',
		},
		experience: {
			title: 'Esperjenza',
			description:
				'Dawn il-cookies jgħinuna nipprovdu esperjenza aħjar għall-utent u nittestjaw karatteristiċi ġodda.',
		},
	},
	frame: {
		title: "Aċċetta l-kunsens ta' {category} biex tara dan il-kontenut.",
		actionButton: "Attiva l-kunsens ta' {category}",
	},
	legalLinks: {
		privacyPolicy: 'Politika tal-Privatezza',
		cookiePolicy: 'Politika tal-Cookies',
		termsOfService: 'Termini tas-Servizz',
	},
};
export default translations;
