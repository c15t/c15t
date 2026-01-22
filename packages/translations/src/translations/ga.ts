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
	legalLinks: {
		privacyPolicy: 'Beartas Príobháideachta',
		cookiePolicy: 'Beartas Fianán',
		termsOfService: 'Téarmaí Seirbhíse',
	},
	iab: {
		banner: {
			title: 'Socruithe príobháideachais',
			description:
				'Stórálaimid agus/nó faighimid rochtain ar fhaisnéis ar do ghléas, muid féin agus ár {partnerCount} comhpháirtí, agus próiseálaimid sonraí pearsanta, amhail aitheantóirí uathúla agus sonraí brabhsála, don suíomh gréasáin seo, chun:',
			partnersLink: '{count} comhpháirtí',
			andMore: 'Agus {count} eile...',
			legitimateInterestNotice:
				'Éilíonn roinnt comhpháirtithe leas dlisteanach chun do shonraí a phróiseáil. Tá an ceart agat cur in aghaidh an phróiseála seo, do roghanna a shaincheapadh, agus do thoiliú a tharraingt siar am ar bith.',
		},
		preferenceCenter: {
			title: 'Socruithe príobháideachais',
			description:
				'Saincheap do shocruithe príobháideachais anseo. Is féidir leat na cineálacha fianán agus teicneolaíochtaí rianaithe a cheadaíonn tú a roghnú.',
			tabs: {
				purposes: 'Cuspóirí',
				vendors: 'Soláthróirí',
			},
			purposeItem: {
				partners: '{count} comhpháirtí',
				vendorsUseLegitimateInterest:
					'Éilíonn {count} soláthróir leas dlisteanach',
				examples: 'Samplaí',
				partnersUsingPurpose: 'Comhpháirtithe a úsáideann an cuspóir seo',
				withYourPermission: 'Le do chead',
				legitimateInterest: 'Leas dlisteanach',
				objectButton: 'Cuir in aghaidh',
				objected: 'Curtha in aghaidh',
				rightToObject:
					'Tá an ceart agat cur in aghaidh próiseála bunaithe ar leas dlisteanach.',
			},
			specialPurposes: {
				title: 'Feidhmeanna riachtanacha (éigeantach)',
				tooltip:
					"Tá siad seo riachtanach d'fheidhmiúlacht agus slándáil an tsuímh. De réir IAB TCF, ní féidir leat cur in aghaidh na gcuspóirí speisialta seo.",
			},
			vendorList: {
				search: 'Cuardaigh soláthróirí...',
				showingCount: '{filtered} as {total} soláthróir',
				iabVendorsHeading: 'Soláthróirí cláraithe IAB',
				iabVendorsNotice:
					'Tá na comhpháirtithe seo cláraithe le Creat Trédhearcachta agus Toilithe IAB (TCF), caighdeán tionscail chun toiliú a bhainistiú',
				customVendorsHeading: 'Comhpháirtithe saincheaptha',
				customVendorsNotice:
					"Is comhpháirtithe saincheaptha iad seo nach bhfuil cláraithe le Creat Trédhearcachta agus Toilithe IAB (TCF). Próiseálann siad sonraí bunaithe ar do thoiliú agus d'fhéadfadh cleachtais phríobháideachta éagsúla a bheith acu ó dhíoltóirí cláraithe IAB.",
				purposes: 'Cuspóirí',
				specialPurposes: 'Cuspóirí speisialta',
				specialFeatures: 'Gnéithe speisialta',
				dataCategories: 'Catagóirí sonraí',
				usesCookies: 'Úsáideann fianáin',
				nonCookieAccess: 'Rochtain neamh-fhianán',
				maxAge: 'Uasaois: {days}l',
				legitimateInterest: 'Leas dlisteanach',
				privacyPolicy: 'Beartas príobháideachta',
				storageDisclosure: 'Nochtadh stórála',
				requiredNotice:
					"Riachtanach d'fheidhmiúlacht an tsuímh, ní féidir é a dhíchumasú",
			},
			footer: {
				consentStorage:
					'Stóráiltear roghanna toilithe i bhfianán darb ainm "euconsent-v2" ar feadh 13 mhí.',
			},
		},
		common: {
			acceptAll: 'Glac le gach rud',
			rejectAll: 'Diúltaigh do gach rud',
			customize: 'Saincheap',
			saveSettings: 'Sábháil socruithe',
			loading: 'Á lódáil...',
			showingSelectedVendor: 'Díoltóir roghnaithe á thaispeáint',
			clearSelection: 'Glan',
			customPartner: 'Comhpháirtí saincheaptha nach bhfuil cláraithe le IAB',
		},
	},
};
export default translations;
