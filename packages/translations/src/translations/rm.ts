import type { CompleteTranslations } from '../types';

export const translations: CompleteTranslations = {
	common: {
		acceptAll: 'Acceptar tut',
		close: 'Serrar',
		customize: 'Persunalisar',
		rejectAll: 'Refusar tut',
		save: 'Memorisar las configuraziuns',
		securedBy: 'Protegiu da',
	},
	consentManagerDialog: {
		description:
			'Persunalisai vossas configuraziuns da la sfera privata qua. Vus pudais tscherner tge tips da cookies e tecnologias da tracking che vus lubis.',
		title: 'Configuraziuns da la sfera privata',
	},
	consentTypes: {
		experience: {
			description:
				"Quests cookies ans gidan a porscher ina meglra experientscha d'utilisader e testar novas funcziuns.",
			title: 'Experientscha',
		},
		functionality: {
			description:
				"Quests cookies permettan funcziunalitads avanzadas e la persunalisaziun da la pagina d'internet.",
			title: 'Funcziunalitad',
		},
		marketing: {
			description:
				'Quests cookies vegnan duvrads per mussar reclamas relevantas e per evaluar lur efficacitad.',
			title: 'Marketing',
		},
		measurement: {
			description:
				"Quests cookies ans gidan a chapir co ils visitaders interageschan cun la pagina d'internet e meglierar sia prestaziun.",
			title: 'Analisa',
		},
		necessary: {
			description:
				"Quests cookies èn essenzials per il funcziunament da la pagina d'internet e na pon betg vegnir deactivads.",
			title: 'Absolutamain necessari',
		},
	},
	cookieBanner: {
		description:
			"Questa pagina d'internet dovra cookies per meglierar vossa experientscha da navigaziun, analisar il traffic da la pagina e mussar cuntegns persunalisads.",
		title: 'Nus stimain vossa sfera privata',
	},
	frame: {
		actionButton: 'Activar il consentiment da {category}',
		error: 'This content could not be loaded.',
		loading: 'Loading content…',
		policyBlocked:
			"This content is unavailable under your region's consent policy.",
		title: 'Acceptai il consentiment da {category} per vesair quest cuntegn.',
	},
	iab: {
		banner: {
			andMore: 'Ed anc {count}...',
			description:
				'Nus ed noss {partnerCount} partunaris memorisain e/u accessain ad infurmaziuns sin voss apparat e processain datas persunalas, sco identificaturs unics e datas da navigaziun, per questa pagina d’internet, per:',
			legitimateInterestNotice:
				'Inscunter partunaris pretendan in interess legitim per processar vossas datas. Vus avais il dretg da far opposiziun cunter quest processament, persunalisar vossas tschernas e revocar voss consentiment en mintga mument.',
			partnersLink: '{count} partunaris',
			scopeGroup:
				'Vossa tscherna vala per tut nossas websites en quest gruppa.',
			scopeServiceSpecific:
				'Voss consent vala be per questa pagina web e na pertutga betg auters servetschs.',
			title: 'Configuraziuns da la sfera privata',
		},
		common: {
			acceptAll: 'Acceptar tut',
			clearSelection: 'Stizzar',
			customPartner: 'Partunari persunalisà betg registrà tar l’IAB',
			customize: 'Persunalisar',
			loading: 'Chargia...',
			rejectAll: 'Refusar tut',
			saveSettings: 'Memorisar las configuraziuns',
			showingSelectedVendor: 'Mussa il proveder tschernì',
		},
		preferenceCenter: {
			description:
				'Persunalisai vossas configuraziuns da la sfera privata qua. Vus pudais tscherner tge tips da cookies e tecnologias da tracking che vus lubis.',
			footer: {
				consentStorage:
					'Las preferenzas da consentiment vegnan memorisadas en in cookie numnà "euconsent-v2" per 13 mais. La durada da memorisaziun po vegnir renovada, cur che vus actualisais vossas preferenzas.',
			},
			purposeItem: {
				examples: 'Exempels',
				legitimateInterest: 'Interess legitim',
				objectButton: 'Far opposiziun',
				objected: 'Opposiziun fatta',
				partners: '{count} partunaris',
				partnersUsingPurpose: 'Partunaris che duvran questa finamira',
				rightToObject:
					'Vus avais il dretg da far opposiziun cunter il processament sa basond sin in interess legitim.',
				vendorsUseLegitimateInterest:
					'{count} proveders pretendan in interess legitim',
				withYourPermission: 'Cun vossa permissiun',
			},
			specialPurposes: {
				title: 'Funcziuns essenzialas (necessari)',
				tooltip:
					'Questas èn necessarias per la funcziunalitad e la segirezza da la pagina. Tenor IAB TCF na pudais vus betg far opposiziun cunter questas finamiras spezialas.',
			},
			tabs: {
				purposes: 'Finamiras',
				vendors: 'Proveders',
			},
			title: 'Configuraziuns da la sfera privata',
			vendorList: {
				customVendorsHeading: 'Partunaris persunalisads',
				customVendorsNotice:
					'Quai èn partunaris persunalisads che n’èn betg registrads tar l’IAB Transparency & Consent Framework (TCF). Els processan datas sa basond sin voss consentiment e pon avair autras praticas da protecziun da datas che proveders registrads tar l’IAB.',
				dataCategories: 'Categorias da datas',
				features: 'Funcziuns',
				iabVendorsHeading: 'Proveders registrads tar l’IAB',
				iabVendorsNotice:
					'Quests partunaris èn registrads tar l’IAB Transparency & Consent Framework (TCF), in standard industrial per la gestiun dal consentiment',
				legitimateInterest: 'Int. legitim',
				maxAge: 'Gradi maximal: {days}d',
				nonCookieAccess: 'Access betg tras cookies',
				privacyPolicy: 'Directivas da protecziun da datas',
				purposes: 'Finamiras',
				requiredNotice:
					'Necessari per la funcziunalitad da la pagina, na po betg vegnir deactivà',
				retention: 'Retegnida: {days}d',
				search: 'Tscherchar proveders...',
				showingCount: 'Mussa {filtered} da {total} proveders',
				specialFeatures: 'Funcziuns spezialas',
				specialPurposes: 'Finamiras spezialas',
				storageDisclosure: 'Infurmaziun davart la memorisaziun',
				usesCookies: 'Dovra cookies',
			},
		},
	},
	legalLinks: {
		cookiePolicy: 'Directivas da cookies',
		privacyPolicy: 'Directivas da protecziun da datas',
		termsOfService: "Cundiziuns d'utilisaziun",
	},
};
export default translations;
