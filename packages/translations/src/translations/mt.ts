import type { CompleteTranslations } from '../types';

export const translations: CompleteTranslations = {
	common: {
		acceptAll: 'Aċċetta kollox',
		close: 'Agħlaq',
		customize: 'Personalizza',
		rejectAll: 'Irrifjuta kollox',
		save: 'Issejvja s-settings',
		securedBy: 'Protett minn',
	},
	consentManagerDialog: {
		description:
			"Personalizza s-settings tal-privatezza tiegħek hawn. Tista' tagħżel liema tipi ta' cookies u teknoloġiji ta' traċċar tippermetti.",
		title: 'Settings tal-privatezza',
	},
	consentTypes: {
		experience: {
			description:
				'Dawn il-cookies jgħinuna nipprovdu esperjenza aħjar għall-utent u nittestjaw karatteristiċi ġodda.',
			title: 'Esperjenza',
		},
		functionality: {
			description:
				'Dawn il-cookies jippermettu funzjonalità mtejba u personalizzazzjoni tas-sit web.',
			title: 'Funzjonalità',
		},
		marketing: {
			description:
				'Dawn il-cookies jintużaw biex iwasslu riklami rilevanti u jittraċċaw l-effettività tagħhom.',
			title: 'Marketing',
		},
		measurement: {
			description:
				'Dawn il-cookies jgħinuna nifhmu kif il-viżitaturi jinteraġixxu mas-sit web u ntejbu l-prestazzjoni tiegħu.',
			title: 'Analitika',
		},
		necessary: {
			description:
				'Dawn il-cookies huma essenzjali biex is-sit web jaħdem sew u ma jistgħux jiġu diżattivati.',
			title: 'Strettament neċessarji',
		},
	},
	cookieBanner: {
		description:
			'Dan is-sit juża cookies biex itejjeb l-esperjenza tal-browsing tiegħek, janalizza t-traffiku tas-sit, u juri kontenut personalizzat.',
		title: 'Napprezzaw il-privatezza tiegħek',
	},
	frame: {
		actionButton: "Attiva l-kunsens ta' {category}",
		error: 'This content could not be loaded.',
		loading: 'Loading content…',
		policyBlocked:
			"This content is unavailable under your region's consent policy.",
		title: "Aċċetta l-kunsens ta' {category} biex tara dan il-kontenut.",
	},
	iab: {
		banner: {
			andMore: 'U {count} oħra...',
			description:
				'Aħna u l-{partnerCount} sieħeb tagħna naħżnu u/jew naċċessaw informazzjoni fuq apparat u nipproċessaw data personali, bħal identifikaturi uniċi u data tal-browsing, għal dan is-sit web, biex:',
			legitimateInterestNotice:
				'Xi sħab jitolbu interess leġittimu biex jipproċessaw id-data tiegħek. Għandek id-dritt li toġġezzjona għal dan il-proċessar, tippersonalizza l-għażliet tiegħek, u tirtira l-kunsens tiegħek fi kwalunkwe ħin.',
			partnersLink: '{count} sieħeb',
			scopeGroup:
				"L-għażla tiegħek tapplika għal kull sit web tagħna f'din il-grupp.",
			scopeServiceSpecific:
				'Il-kunsens tiegħek japplika biss għal dan is-sit web u ma jaffettwax servizzi oħra.',
			title: 'Settings tal-privatezza',
		},
		common: {
			acceptAll: 'Aċċetta kollox',
			clearSelection: 'Ikklerja',
			customPartner: 'Sieħeb personalizzat mhux reġistrat mal-IAB',
			customize: 'Personalizza',
			loading: 'Qed jillowdja...',
			rejectAll: 'Irrifjuta kollox',
			saveSettings: 'Issejvja s-settings',
			showingSelectedVendor: 'Qed jintwera l-bejjiegħ magħżul',
		},
		preferenceCenter: {
			description:
				"Personalizza s-settings tal-privatezza tiegħek hawn. Tista' tagħżel liema tipi ta' cookies u teknoloġiji ta' traċċar tippermetti.",
			footer: {
				consentStorage:
					'Il-preferenzi tal-kunsens huma maħżuna f’cookie msemmija "euconsent-v2" għal 13-il xahar. Il-perjodu tal-ħażna jista’ jiġġedded meta taġġorna l-preferenzi tiegħek.',
			},
			purposeItem: {
				examples: 'Eżempji',
				legitimateInterest: 'Interess Leġittimu',
				objectButton: 'Oġġezzjona',
				objected: 'Oġġezzjonat',
				partners: '{count} sieħeb',
				partnersUsingPurpose: 'Sħab li Jużaw dan l-Għan',
				rightToObject:
					'Għandek id-dritt li toġġezzjona għall-ipproċessar ibbażat fuq interess leġittimu.',
				vendorsUseLegitimateInterest:
					'{count} bejjiegħ jitolbu interess leġittimu',
				withYourPermission: 'Bil-Permess Tiegħek',
			},
			specialPurposes: {
				title: 'Funzjonijiet Essenzjali (Meħtieġa)',
				tooltip:
					'Dawn huma meħtieġa għall-funzjonalità u s-sigurtà tas-sit. Skont l-IAB TCF, ma tistax toġġezzjona għal dawn l-għanijiet speċjali.',
			},
			tabs: {
				purposes: 'Għanijiet',
				vendors: 'Bejjiegħa',
			},
			title: 'Settings tal-privatezza',
			vendorList: {
				customVendorsHeading: 'Sħab Personalizzati',
				customVendorsNotice:
					'Dawn huma sħab personalizzati mhux reġistrati mal-IAB Transparency & Consent Framework (TCF). Huma jipproċessaw id-data abbażi tal-kunsens tiegħek u jista’ jkollhom prattiki ta’ privatezza differenti minn bejjiegħa reġistrati fl-IAB.',
				dataCategories: 'Kategoriji tad-Data',
				features: 'Karatteristiċi',
				iabVendorsHeading: 'Bejjiegħa Reġistrati fl-IAB',
				iabVendorsNotice:
					'Dawn is-sħab huma reġistrati mal-IAB Transparency & Consent Framework (TCF), standard tal-industrija għall-immaniġġjar tal-kunsens',
				legitimateInterest: 'Int. Leġittimu',
				maxAge: 'Età Massima: {days}j',
				nonCookieAccess: 'Aċċess Mhux tal-Cookie',
				privacyPolicy: 'Politika tal-Privatezza',
				purposes: 'Għanijiet',
				requiredNotice:
					'Meħtieġ għall-funzjonalità tas-sit, ma jistax jiġi diżattivat',
				retention: 'Żamma: {days}j',
				search: 'Fittex bejjiegħa...',
				showingCount: 'Qed jintwerew {filtered} minn {total} bejjiegħ',
				specialFeatures: 'Karatteristiċi Speċjali',
				specialPurposes: 'Għanijiet Speċjali',
				storageDisclosure: 'Żvelar tal-Ħażna',
				usesCookies: 'Juża l-Cookies',
			},
		},
	},
	legalLinks: {
		cookiePolicy: 'Politika tal-Cookies',
		privacyPolicy: 'Politika tal-Privatezza',
		termsOfService: 'Termini tas-Servizz',
	},
};
export default translations;
