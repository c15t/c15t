import type { CompleteTranslations } from '../types';
export const translations: CompleteTranslations = {
	common: {
		acceptAll: 'Acceptar tut',
		rejectAll: 'Refusar tut',
		customize: 'Persunalisar',
		save: 'Memorisar las configuraziuns',
	},
	cookieBanner: {
		title: 'Nus stimain vossa sfera privata',
		description:
			"Questa pagina d'internet dovra cookies per meglierar vossa experientscha da navigaziun, analisar il traffic da la pagina e mussar cuntegns persunalisads.",
	},
	consentManagerDialog: {
		title: 'Configuraziuns da la sfera privata',
		description:
			'Persunalisai vossas configuraziuns da la sfera privata qua. Vus pudais tscherner tge tips da cookies e tecnologias da tracking che vus lubis.',
	},
	consentTypes: {
		necessary: {
			title: 'Absolutamain necessari',
			description:
				"Quests cookies èn essenzials per il funcziunament da la pagina d'internet e na pon betg vegnir deactivads.",
		},
		functionality: {
			title: 'Funcziunalitad',
			description:
				"Quests cookies permettan funcziunalitads avanzadas e la persunalisaziun da la pagina d'internet.",
		},
		marketing: {
			title: 'Marketing',
			description:
				'Quests cookies vegnan duvrads per mussar reclamas relevantas e per evaluar lur efficacitad.',
		},
		measurement: {
			title: 'Analisa',
			description:
				"Quests cookies ans gidan a chapir co ils visitaders interageschan cun la pagina d'internet e meglierar sia prestaziun.",
		},
		experience: {
			title: 'Experientscha',
			description:
				"Quests cookies ans gidan a porscher ina meglra experientscha d'utilisader e testar novas funcziuns.",
		},
	},
	frame: {
		title: 'Acceptai il consentiment da {category} per vesair quest cuntegn.',
		actionButton: 'Activar il consentiment da {category}',
	},
	legalLinks: {
		privacyPolicy: 'Directivas da protecziun da datas',
		cookiePolicy: 'Directivas da cookies',
		termsOfService: "Cundiziuns d'utilisaziun",
	},
	iab: {
		banner: {
			title: 'Configuraziuns da la sfera privata',
			description:
				'Nus ed noss {partnerCount} partunaris memorisain e/u accessain ad infurmaziuns sin voss apparat e processain datas persunalas, sco identificaturs unics e datas da navigaziun, per questa pagina d’internet, per:',
			partnersLink: '{count} partunaris',
			andMore: 'Ed anc {count}...',
			legitimateInterestNotice:
				'Inscunter partunaris pretendan in interess legitim per processar vossas datas. Vus avais il dretg da far opposiziun cunter quest processament, persunalisar vossas tschernas e revocar voss consentiment en mintga mument.',
		},
		preferenceCenter: {
			title: 'Configuraziuns da la sfera privata',
			description:
				'Persunalisai vossas configuraziuns da la sfera privata qua. Vus pudais tscherner tge tips da cookies e tecnologias da tracking che vus lubis.',
			tabs: {
				purposes: 'Finamiras',
				vendors: 'Proveders',
			},
			purposeItem: {
				partners: '{count} partunaris',
				vendorsUseLegitimateInterest:
					'{count} proveders pretendan in interess legitim',
				examples: 'Exempels',
				partnersUsingPurpose: 'Partunaris che duvran questa finamira',
				withYourPermission: 'Cun vossa permissiun',
				legitimateInterest: 'Interess legitim',
				objectButton: 'Far opposiziun',
				objected: 'Opposiziun fatta',
				rightToObject:
					'Vus avais il dretg da far opposiziun cunter il processament sa basond sin in interess legitim.',
			},
			specialPurposes: {
				title: 'Funcziuns essenzialas (necessari)',
				tooltip:
					'Questas èn necessarias per la funcziunalitad e la segirezza da la pagina. Tenor IAB TCF na pudais vus betg far opposiziun cunter questas finamiras spezialas.',
			},
			vendorList: {
				search: 'Tscherchar proveders...',
				showingCount: 'Mussa {filtered} da {total} proveders',
				iabVendorsHeading: 'Proveders registrads tar l’IAB',
				iabVendorsNotice:
					'Quests partunaris èn registrads tar l’IAB Transparency & Consent Framework (TCF), in standard industrial per la gestiun dal consentiment',
				customVendorsHeading: 'Partunaris persunalisads',
				customVendorsNotice:
					'Quai èn partunaris persunalisads che n’èn betg registrads tar l’IAB Transparency & Consent Framework (TCF). Els processan datas sa basond sin voss consentiment e pon avair autras praticas da protecziun da datas che proveders registrads tar l’IAB.',
				purposes: 'Finamiras',
				specialPurposes: 'Finamiras spezialas',
				specialFeatures: 'Funcziuns spezialas',
				dataCategories: 'Categorias da datas',
				usesCookies: 'Dovra cookies',
				nonCookieAccess: 'Access betg tras cookies',
				maxAge: 'Gradi maximal: {days}d',
				legitimateInterest: 'Int. legitim',
				privacyPolicy: 'Directivas da protecziun da datas',
				storageDisclosure: 'Infurmaziun davart la memorisaziun',
				requiredNotice:
					'Necessari per la funcziunalitad da la pagina, na po betg vegnir deactivà',
			},
			footer: {
				consentStorage:
					'Las preferenzas da consentiment vegnan memorisadas en in cookie numnà "euconsent-v2" per 13 mais.',
			},
		},
		common: {
			acceptAll: 'Acceptar tut',
			rejectAll: 'Refusar tut',
			customize: 'Persunalisar',
			saveSettings: 'Memorisar las configuraziuns',
			loading: 'Chargia...',
			showingSelectedVendor: 'Mussa il proveder tschernì',
			clearSelection: 'Stizzar',
			customPartner: 'Partunari persunalisà betg registrà tar l’IAB',
		},
	},
};
export default translations;
