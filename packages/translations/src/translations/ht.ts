import type { CompleteTranslations } from '../types';

export const translations: CompleteTranslations = {
	common: {
		acceptAll: 'Aksepte tout',
		acknowledge: 'Dakò',
		close: 'Fèmen',
		customize: 'Pèsonalize',
		dismiss: 'Fèmen',
		rejectAll: 'Refize tout',
		save: 'Anrejistre paramèt yo',
		securedBy: 'Pwoteje pa',
	},
	consentGate: {
		actionButton: 'Aktive konsantman pou {category}',
		error: 'Nou pa t kapab chaje kontni sa a.',
		loading: 'N ap chaje kontni an…',
		policyBlocked:
			'Kontni sa a pa disponib dapre règ konsantman ki aplike nan rejyon ou a.',
		title: 'Aksepte konsantman {category} pou ou ka wè kontni sa a.',
	},
	consentManagerDialog: {
		description:
			'Pèsonalize paramèt konfidansyalite ou yo isit la. Ou ka chwazi ki kalite cookie ak teknoloji swivi ou vle otorize.',
		title: 'Paramèt konfidansyalite',
		vendors: {
			disabledByCategory: 'Aktive kategori sa a pou ou ka chwazi founisè yo.',
			privacyPolicy: 'Politik konfidansyalite',
			switchLabel: 'Pèmèt {vendor}',
			title: 'Founisè ({count})',
		},
	},
	consentTypes: {
		experience: {
			description:
				'Cookie sa yo ede nou ba ou yon pi bon eksperyans epi teste nouvo fonksyon.',
			title: 'Eksperyans',
		},
		functionality: {
			description:
				'Cookie sa yo pèmèt sit entènèt la ofri plis fonksyon epi adapte li pou ou.',
			title: 'Fonksyonalite',
		},
		marketing: {
			description:
				'Cookie sa yo sèvi pou montre ou piblisite ki enterese ou epi mezire si piblisite sa yo efikas.',
			title: 'Maketing',
		},
		measurement: {
			description:
				'Cookie sa yo ede nou konprann ki jan vizitè yo itilize sit entènèt la pou nou ka amelyore pèfòmans li.',
			title: 'Analiz',
		},
		necessary: {
			description:
				'Cookie sa yo esansyèl pou sit entènèt la mache byen, epi ou pa ka dezaktive yo.',
			title: 'Absoliman nesesè',
		},
	},
	cookieBanner: {
		description:
			'Sit sa a itilize cookie pou amelyore eksperyans navigasyon ou, analize trafik sit la epi montre ou kontni ki pèsonalize.',
		noticeDescription:
			'Nou itilize cookie ak lòt teknoloji ki sanble pou fè sit sa a mache, pou mezire trafik, epi pou pèsonalize kontni ak piblisite. Ou ka refize oswa jere preferans ou yo nenpòt ki lè.',
		noticeTitle: 'Avi sou konfidansyalite',
		title: 'Nou respekte vi prive ou',
	},
	iab: {
		banner: {
			andMore: 'Ak {count} lòt...',
			description:
				'Nou menm ak {partnerCount} patnè nou yo estoke enfòmasyon sou aparèy ou epi/oswa jwenn aksè ak enfòmasyon sa yo, epi nou trete done pèsonèl, tankou idantifyan inik ak done navigasyon, pou sit entènèt sa a, pou nou ka:',
			legitimateInterestNotice:
				'Kèk patnè di yo gen yon enterè lejitim pou trete done ou yo. Ou gen dwa opoze ou ak tretman sa a, pèsonalize chwa ou yo epi retire konsantman ou nenpòt ki lè.',
			partnersLink: '{count} patnè',
			scopeGroup:
				'Chwa ou a aplike sou tout sit entènèt nou yo ki nan gwoup sa a.',
			scopeServiceSpecific:
				'Konsantman ou aplike sèlman pou sit entènèt sa a, li p ap afekte lòt sèvis.',
			title: 'Paramèt konfidansyalite',
		},
		common: {
			acceptAll: 'Aksepte tout',
			clearSelection: 'Efase',
			customPartner: 'Patnè pèsonalize ki pa anrejistre nan IAB',
			customize: 'Pèsonalize',
			loading: 'N ap chaje...',
			rejectAll: 'Refize tout',
			saveSettings: 'Anrejistre paramèt yo',
			showingSelectedVendor: 'N ap montre founisè ou chwazi a',
		},
		preferenceCenter: {
			description:
				'Pèsonalize paramèt konfidansyalite ou yo isit la. Ou ka chwazi ki kalite cookie ak teknoloji swivi ou vle otorize.',
			features: {
				description:
					'Metòd tretman sa yo ka sèvi sèlman pou reyalize youn oswa plizyè nan objektif avi sa a kite ou chwazi.',
				title: 'Karakteristik',
			},
			footer: {
				consentStorage:
					'Nou estoke preferans konsantman ou yo nan yon cookie ki rele "euconsent-v2" pandan 13 mwa. Dire estokaj la ka rekòmanse lè ou mete preferans ou yo ajou.',
			},
			purposeItem: {
				examples: 'Egzanp',
				legitimateInterest: 'Enterè lejitim',
				objectButton: 'Opoze',
				objected: 'Opozisyon anrejistre',
				partners: '{count} patnè',
				partnersUsingPurpose: 'Patnè ki itilize objektif sa a',
				rightToObject:
					'Ou gen dwa opoze ou ak tretman ki baze sou enterè lejitim.',
				vendorsUseLegitimateInterest:
					'{count} founisè di yo gen yon enterè lejitim',
				withYourPermission: 'Avèk pèmisyon ou',
			},
			specialPurposes: {
				title: 'Fonksyon esansyèl (obligatwa)',
				tooltip:
					'Sit la bezwen fonksyon sa yo pou li mache epi pou li rete an sekirite. Dapre IAB TCF, ou pa ka opoze ou ak objektif espesyal sa yo.',
			},
			tabs: {
				purposes: 'Objektif',
				vendors: 'Founisè',
			},
			title: 'Paramèt konfidansyalite',
			vendorList: {
				adTechProvidersHeading: 'Founisè teknoloji piblisite Google yo',
				adTechProvidersNotice:
					'Google travay ak founisè teknoloji piblisite sa yo andeyò kad IAB la. Konsantman ou rive jwenn yon founisè sèlman si ou aktive li, epi si ou pèmèt tou estokaj sou aparèy ou ak piblisite pèsonalize.',
				customVendorsHeading: 'Patnè pèsonalize',
				customVendorsNotice:
					'Sa yo se patnè pèsonalize ki pa anrejistre nan Kad Transparans ak Konsantman IAB la (TCF). Yo trete done yo dapre konsantman ou, epi pratik konfidansyalite yo ka diferan de pa founisè ki anrejistre nan IAB yo.',
				dataCategories: 'Kategori done',
				features: 'Karakteristik',
				iabVendorsHeading: 'Founisè ki anrejistre nan IAB',
				iabVendorsNotice:
					'Patnè sa yo anrejistre nan Kad Transparans ak Konsantman IAB la (TCF), yon estanda endistri a itilize pou jere konsantman',
				legitimateInterest: 'Enterè lejitim',
				maxAge: 'Dire maksimòm: {days} jou',
				maxAgeRefreshes: '(li renouvle)',
				noVendorsFound: 'Pa gen founisè ki koresponn ak "{searchTerm}"',
				nonCookieAccess: 'Aksè san cookie',
				partnerCount: '{count} patnè',
				partnerPlural: 'patnè',
				partnerSingular: 'patnè',
				privacyPolicy: 'Politik konfidansyalite',
				purposes: 'Objektif',
				requiredNotice: 'Obligatwa pou sit la mache, ou pa ka dezaktive li',
				retainedDays: 'Konsève: {days} jou',
				retention: 'Dire konsèvasyon: {days} jou',
				search: 'Chèche founisè...',
				showingCount: '{filtered} sou {total} founisè',
				specialFeatures: 'Karakteristik espesyal',
				specialPurposes: 'Objektif espesyal',
				storageDisclosure: 'Enfòmasyon sou estokaj',
				usesCookies: 'Itilize cookie',
			},
		},
	},
	legalLinks: {
		cookiePolicy: 'Politik sou cookie',
		privacyPolicy: 'Politik konfidansyalite',
		termsOfService: 'Kondisyon itilizasyon',
	},
	rights: {
		optOut: 'Pa vann ni pataje done mwen yo',
		preferences: 'Jere preferans yo',
	},
};

export default translations;
