import type { CompleteTranslations } from '../types';

export const translations: CompleteTranslations = {
	common: {
		acceptAll: 'Glac le Gach Rud',
		close: 'Dún',
		customize: 'Saincheap',
		rejectAll: 'Diúltaigh do Gach Rud',
		save: 'Sábháil Socruithe',
		securedBy: 'Cosanta ag',
	},
	consentManagerDialog: {
		description:
			'Saincheap do shocruithe príobháideachais anseo. Is féidir leat na cineálacha fianán agus teicneolaíochtaí rianaithe a cheadaíonn tú a roghnú.',
		title: 'Socruithe Príobháideachais',
	},
	consentTypes: {
		experience: {
			description:
				'Cabhraíonn na fianáin seo linn taithí úsáideora níos fearr a sholáthar agus gnéithe nua a thástáil.',
			title: 'Taithí',
		},
		functionality: {
			description:
				'Cumasaíonn na fianáin seo feidhmiúlacht fheabhsaithe agus pearsantú an tsuímh ghréasáin.',
			title: 'Feidhmiúlacht',
		},
		marketing: {
			description:
				'Úsáidtear na fianáin seo chun fógraí ábhartha a sheachadadh agus a n-éifeachtacht a rianú.',
			title: 'Margaíocht',
		},
		measurement: {
			description:
				'Cabhraíonn na fianáin seo linn tuiscint a fháil ar conas a idirghníomhaíonn cuairteoirí leis an suíomh gréasáin agus a fheidhmíocht a fheabhsú.',
			title: 'Anailísíocht',
		},
		necessary: {
			description:
				'Tá na fianáin seo riachtanach chun go bhfeidhmeoidh an suíomh gréasáin i gceart agus ní féidir iad a dhíchumasú.',
			title: 'Fíor-Riachtanach',
		},
	},
	cookieBanner: {
		description:
			'Úsáideann an suíomh seo fianáin chun do thaithí bhrabhsála a fheabhsú, trácht suímh a anailísiú, agus ábhar pearsantaithe a thaispeáint.',
		title: 'Tugaimid luach do do phríobháideachas',
	},
	frame: {
		actionButton: 'Cumasaigh toiliú {category}',
		error: 'This content could not be loaded.',
		loading: 'Loading content…',
		policyBlocked:
			"This content is unavailable under your region's consent policy.",
		title: 'Glac le toiliú {category} chun an t-ábhar seo a fheiceáil.',
	},
	iab: {
		banner: {
			andMore: 'Agus {count} eile...',
			description:
				'Stórálaimid agus/nó faighimid rochtain ar fhaisnéis ar do ghléas, muid féin agus ár {partnerCount} comhpháirtí, agus próiseálaimid sonraí pearsanta, amhail aitheantóirí uathúla agus sonraí brabhsála, don suíomh gréasáin seo, chun:',
			legitimateInterestNotice:
				'Éilíonn roinnt comhpháirtithe leas dlisteanach chun do shonraí a phróiseáil. Tá an ceart agat cur in aghaidh an phróiseála seo, do roghanna a shaincheapadh, agus do thoiliú a tharraingt siar am ar bith.',
			partnersLink: '{count} comhpháirtí',
			scopeGroup:
				'Baineann do rogha le gach ceann dár láithreáin ghréasáin sa ghrúpa seo.',
			scopeServiceSpecific:
				'Baineann do thoiliú leis an suíomh gréasáin seo amháin agus ní dhéanfaidh sé difear do sheirbhísí eile.',
			title: 'Socruithe príobháideachais',
		},
		common: {
			acceptAll: 'Glac le gach rud',
			clearSelection: 'Glan',
			customPartner: 'Comhpháirtí saincheaptha nach bhfuil cláraithe le IAB',
			customize: 'Saincheap',
			loading: 'Á lódáil...',
			rejectAll: 'Diúltaigh do gach rud',
			saveSettings: 'Sábháil socruithe',
			showingSelectedVendor: 'Díoltóir roghnaithe á thaispeáint',
		},
		preferenceCenter: {
			description:
				'Saincheap do shocruithe príobháideachais anseo. Is féidir leat na cineálacha fianán agus teicneolaíochtaí rianaithe a cheadaíonn tú a roghnú.',
			footer: {
				consentStorage:
					'Stóráiltear roghanna toilithe i bhfianán darb ainm "euconsent-v2" ar feadh 13 mhí. D\'fhéadfaí an tréimhse stórála a athnuachan nuair a nuashonraíonn tú do roghanna.',
			},
			purposeItem: {
				examples: 'Samplaí',
				legitimateInterest: 'Leas dlisteanach',
				objectButton: 'Cuir in aghaidh',
				objected: 'Curtha in aghaidh',
				partners: '{count} comhpháirtí',
				partnersUsingPurpose: 'Comhpháirtithe a úsáideann an cuspóir seo',
				rightToObject:
					'Tá an ceart agat cur in aghaidh próiseála bunaithe ar leas dlisteanach.',
				vendorsUseLegitimateInterest:
					'Éilíonn {count} soláthróir leas dlisteanach',
				withYourPermission: 'Le do chead',
			},
			specialPurposes: {
				title: 'Feidhmeanna riachtanacha (éigeantach)',
				tooltip:
					"Tá siad seo riachtanach d'fheidhmiúlacht agus slándáil an tsuímh. De réir IAB TCF, ní féidir leat cur in aghaidh na gcuspóirí speisialta seo.",
			},
			tabs: {
				purposes: 'Cuspóirí',
				vendors: 'Soláthróirí',
			},
			title: 'Socruithe príobháideachais',
			vendorList: {
				customVendorsHeading: 'Comhpháirtithe saincheaptha',
				customVendorsNotice:
					"Is comhpháirtithe saincheaptha iad seo nach bhfuil cláraithe le Creat Trédhearcachta agus Toilithe IAB (TCF). Próiseálann siad sonraí bunaithe ar do thoiliú agus d'fhéadfadh cleachtais phríobháideachta éagsúla a bheith acu ó dhíoltóirí cláraithe IAB.",
				dataCategories: 'Catagóirí sonraí',
				features: 'Gnéithe',
				iabVendorsHeading: 'Soláthróirí cláraithe IAB',
				iabVendorsNotice:
					'Tá na comhpháirtithe seo cláraithe le Creat Trédhearcachta agus Toilithe IAB (TCF), caighdeán tionscail chun toiliú a bhainistiú',
				legitimateInterest: 'Leas dlisteanach',
				maxAge: 'Uasaois: {days}l',
				nonCookieAccess: 'Rochtain neamh-fhianán',
				privacyPolicy: 'Beartas príobháideachta',
				purposes: 'Cuspóirí',
				requiredNotice:
					"Riachtanach d'fheidhmiúlacht an tsuímh, ní féidir é a dhíchumasú",
				retention: 'Coinneáil: {days}l',
				search: 'Cuardaigh soláthróirí...',
				showingCount: '{filtered} as {total} soláthróir',
				specialFeatures: 'Gnéithe speisialta',
				specialPurposes: 'Cuspóirí speisialta',
				storageDisclosure: 'Nochtadh stórála',
				usesCookies: 'Úsáideann fianáin',
			},
		},
	},
	legalLinks: {
		cookiePolicy: 'Beartas Fianán',
		privacyPolicy: 'Beartas Príobháideachta',
		termsOfService: 'Téarmaí Seirbhíse',
	},
};
export default translations;
