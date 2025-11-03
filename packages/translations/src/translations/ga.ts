import type { CompleteTranslations } from '../types';
export const translations: CompleteTranslations = {
	common: {
		acceptAll: 'Glac le Gach Rud',
		rejectAll: 'Diúltaigh do Gach Rud',
		customize: 'Saincheap',
		save: 'Sábháil Socruithe',
	},
	cookieBanner: {
		title: 'Tugaimid luach do do phríobháideachas',
		description:
			'Úsáideann an suíomh seo fianáin chun do thaithí bhrabhsála a fheabhsú, trácht suímh a anailísiú, agus ábhar pearsantaithe a thaispeáint.',
	},
	consentManagerDialog: {
		title: 'Socruithe Príobháideachais',
		description:
			'Saincheap do shocruithe príobháideachais anseo. Is féidir leat na cineálacha fianán agus teicneolaíochtaí rianaithe a cheadaíonn tú a roghnú.',
	},
	consentTypes: {
		necessary: {
			title: 'Fíor-Riachtanach',
			description:
				'Tá na fianáin seo riachtanach chun go bhfeidhmeoidh an suíomh gréasáin i gceart agus ní féidir iad a dhíchumasú.',
		},
		functionality: {
			title: 'Feidhmiúlacht',
			description:
				'Cumasaíonn na fianáin seo feidhmiúlacht fheabhsaithe agus pearsantú an tsuímh ghréasáin.',
		},
		marketing: {
			title: 'Margaíocht',
			description:
				'Úsáidtear na fianáin seo chun fógraí ábhartha a sheachadadh agus a n-éifeachtacht a rianú.',
		},
		measurement: {
			title: 'Anailísíocht',
			description:
				'Cabhraíonn na fianáin seo linn tuiscint a fháil ar conas a idirghníomhaíonn cuairteoirí leis an suíomh gréasáin agus a fheidhmíocht a fheabhsú.',
		},
		experience: {
			title: 'Taithí',
			description:
				'Cabhraíonn na fianáin seo linn taithí úsáideora níos fearr a sholáthar agus gnéithe nua a thástáil.',
		},
	},
	frame: {
		title: 'Glac le toiliú {category} chun an t-ábhar seo a fheiceáil.',
		actionButton: 'Cumasaigh toiliú {category}',
	},
};
export default translations;
