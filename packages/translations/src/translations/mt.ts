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
	iab: {
		banner: {
			title: 'Settings tal-privatezza',
			description:
				'Aħna u l-{partnerCount} sieħeb tagħna naħżnu u/jew naċċessaw informazzjoni fuq apparat u nipproċessaw data personali, bħal identifikaturi uniċi u data tal-browsing, għal dan is-sit web, biex:',
			partnersLink: '{count} sieħeb',
			andMore: 'U {count} oħra...',
			legitimateInterestNotice:
				'Xi sħab jitolbu interess leġittimu biex jipproċessaw id-data tiegħek. Għandek id-dritt li toġġezzjona għal dan il-proċessar, tippersonalizza l-għażliet tiegħek, u tirtira l-kunsens tiegħek fi kwalunkwe ħin.',
		},
		preferenceCenter: {
			title: 'Settings tal-privatezza',
			description:
				"Personalizza s-settings tal-privatezza tiegħek hawn. Tista' tagħżel liema tipi ta' cookies u teknoloġiji ta' traċċar tippermetti.",
			tabs: {
				purposes: 'Għanijiet',
				vendors: 'Bejjiegħa',
			},
			purposeItem: {
				partners: '{count} sieħeb',
				vendorsUseLegitimateInterest:
					'{count} bejjiegħ jitolbu interess leġittimu',
				examples: 'Eżempji',
				partnersUsingPurpose: 'Sħab li Jużaw dan l-Għan',
				withYourPermission: 'Bil-Permess Tiegħek',
				legitimateInterest: 'Interess Leġittimu',
				objectButton: 'Oġġezzjona',
				objected: 'Oġġezzjonat',
				rightToObject:
					'Għandek id-dritt li toġġezzjona għall-ipproċessar ibbażat fuq interess leġittimu.',
			},
			specialPurposes: {
				title: 'Funzjonijiet Essenzjali (Meħtieġa)',
				tooltip:
					'Dawn huma meħtieġa għall-funzjonalità u s-sigurtà tas-sit. Skont l-IAB TCF, ma tistax toġġezzjona għal dawn l-għanijiet speċjali.',
			},
			vendorList: {
				search: 'Fittex bejjiegħa...',
				showingCount: 'Qed jintwerew {filtered} minn {total} bejjiegħ',
				iabVendorsHeading: 'Bejjiegħa Reġistrati fl-IAB',
				iabVendorsNotice:
					'Dawn is-sħab huma reġistrati mal-IAB Transparency & Consent Framework (TCF), standard tal-industrija għall-immaniġġjar tal-kunsens',
				customVendorsHeading: 'Sħab Personalizzati',
				customVendorsNotice:
					'Dawn huma sħab personalizzati mhux reġistrati mal-IAB Transparency & Consent Framework (TCF). Huma jipproċessaw id-data abbażi tal-kunsens tiegħek u jista’ jkollhom prattiki ta’ privatezza differenti minn bejjiegħa reġistrati fl-IAB.',
				purposes: 'Għanijiet',
				specialPurposes: 'Għanijiet Speċjali',
				specialFeatures: 'Karatteristiċi Speċjali',
				dataCategories: 'Kategoriji tad-Data',
				usesCookies: 'Juża l-Cookies',
				nonCookieAccess: 'Aċċess Mhux tal-Cookie',
				maxAge: 'Età Massima: {days}j',
				legitimateInterest: 'Int. Leġittimu',
				privacyPolicy: 'Politika tal-Privatezza',
				storageDisclosure: 'Żvelar tal-Ħażna',
				requiredNotice:
					'Meħtieġ għall-funzjonalità tas-sit, ma jistax jiġi diżattivat',
			},
			footer: {
				consentStorage:
					'Il-preferenzi tal-kunsens huma maħżuna f’cookie msemmija "euconsent-v2" għal 13-il xahar.',
			},
		},
		common: {
			acceptAll: 'Aċċetta kollox',
			rejectAll: 'Irrifjuta kollox',
			customize: 'Personalizza',
			saveSettings: 'Issejvja s-settings',
			loading: 'Qed jillowdja...',
			showingSelectedVendor: 'Qed jintwera l-bejjiegħ magħżul',
			clearSelection: 'Ikklerja',
			customPartner: 'Sieħeb personalizzat mhux reġistrat mal-IAB',
		},
	},
};
export default translations;
