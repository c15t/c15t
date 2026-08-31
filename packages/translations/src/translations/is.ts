import type { CompleteTranslations } from '../types';

export const translations: CompleteTranslations = {
	common: {
		acceptAll: 'Samþykkja allt',
		close: 'Loka',
		customize: 'Sérsníða',
		rejectAll: 'Hafna öllu',
		save: 'Vista stillingar',
		securedBy: 'Varið af',
	},
	consentManagerDialog: {
		description:
			'Sérsníðaðu persónuverndastillingar þínar hér. Þú getur valið hvaða tegundir af vafrakökum og rakningartækni þú leyfir.',
		title: 'Persónuverndastillingar',
	},
	consentTypes: {
		experience: {
			description:
				'Þessar vafrakökur hjálpa okkur að veita betri notendaupplifun og prófa nýja eiginleika.',
			title: 'Upplifun',
		},
		functionality: {
			description:
				'Þessar vafrakökur gera mögulegt að auka virkni og persónumiða vefsíðuna.',
			title: 'Virkni',
		},
		marketing: {
			description:
				'Þessar vafrakökur eru notaðar til að birta viðeigandi auglýsingar og fylgjast með árangri þeirra.',
			title: 'Markaðssetning',
		},
		measurement: {
			description:
				'Þessar vafrakökur hjálpa okkur að skilja hvernig gestir nota vefsíðuna og bæta frammistöðu hennar.',
			title: 'Greining',
		},
		necessary: {
			description:
				'Þessar vafrakökur eru nauðsynlegar til að vefsíðan virki rétt og ekki er hægt að slökkva á þeim.',
			title: 'Nauðsynlegar',
		},
	},
	cookieBanner: {
		description:
			'Þessi vefur notar vafrakökur til að bæta vafraupplifun þína, greina umferð á vefnum og sýna persónumiðað efni.',
		title: 'Við metum friðhelgi þína',
	},
	frame: {
		actionButton: 'Virkja {category} samþykki',
		error: 'This content could not be loaded.',
		loading: 'Loading content…',
		policyBlocked:
			"This content is unavailable under your region's consent policy.",
		title: 'Samþykktu {category} samþykki til að skoða þetta efni.',
	},
	iab: {
		banner: {
			andMore: 'Og {count} til viðbótar...',
			description:
				'Við og {partnerCount} samstarfsaðilar okkar geymum og/eða höfum aðgang að upplýsingum á tækinu þínu og vinnum persónuupplýsingar, svo sem einstök auðkenni og vafraupplýsingar, fyrir þessa vefsíðu, til að:',
			legitimateInterestNotice:
				'Sumir samstarfsaðilar krefjast lögmætra hagsmuna til að vinna gögnin þín. Þú átt rétt á að andmæla þessari vinnslu, sérsníða val þitt og draga samþykki þitt til baka hvenær sem er.',
			partnersLink: '{count} samstarfsaðilar',
			scopeGroup: 'Val þitt gildir á öllum vefsíðum okkar í þessum hóp.',
			scopeServiceSpecific:
				'Samþykki þitt gildir aðeins fyrir þessa vefsíðu og hefur ekki áhrif á aðrar þjónustur.',
			title: 'Persónuverndastillingar',
		},
		common: {
			acceptAll: 'Samþykkja allt',
			clearSelection: 'Hreinsa',
			customPartner: 'Sérsniðinn samstarfsaðili ekki skráður hjá IAB',
			customize: 'Sérsníða',
			loading: 'Hleður...',
			rejectAll: 'Hafna öllu',
			saveSettings: 'Vista stillingar',
			showingSelectedVendor: 'Sýnir valdan söluaðila',
		},
		preferenceCenter: {
			description:
				'Sérsníðaðu persónuverndastillingar þínar hér. Þú getur valið hvaða tegundir af vafrakökum og rakningartækni þú leyfir.',
			footer: {
				consentStorage:
					'Samþykkisstillingar eru geymdar í vafraköku sem heitir "euconsent-v2" í 13 mánuði. Geymslutíminn kann að endurnýjast þegar þú uppfærir stillingar þínar.',
			},
			purposeItem: {
				examples: 'Dæmi',
				legitimateInterest: 'Lögmætir hagsmunir',
				objectButton: 'Andmæla',
				objected: 'Andmælt',
				partners: '{count} samstarfsaðilar',
				partnersUsingPurpose: 'Samstarfsaðilar sem nota þennan tilgang',
				rightToObject:
					'Þú átt rétt á að andmæla vinnslu sem byggir á lögmætum hagsmunum.',
				vendorsUseLegitimateInterest:
					'{count} söluaðilar krefjast lögmætra hagsmuna',
				withYourPermission: 'Með þínu leyfi',
			},
			specialPurposes: {
				title: 'Nauðsynleg virkni (krafist)',
				tooltip:
					'Þetta er nauðsynlegt fyrir virkni og öryggi vefsins. Samkvæmt IAB TCF geturðu ekki andmælt þessum sérstöku markmiðum.',
			},
			tabs: {
				purposes: 'Tilgangur',
				vendors: 'Söluaðilar',
			},
			title: 'Persónuverndastillingar',
			vendorList: {
				customVendorsHeading: 'Sérsniðnir samstarfsaðilar',
				customVendorsNotice:
					'Þetta eru sérsniðnir samstarfsaðilar sem eru ekki skráðir hjá IAB Transparency & Consent Framework (TCF). Þeir vinna gögn byggt á samþykki þínu og gætu haft aðrar persónuverndarreglur en IAB-skráðir söluaðilar.',
				dataCategories: 'Gagnaflokkar',
				features: 'Eiginleikar',
				iabVendorsHeading: 'IAB skráðir söluaðilar',
				iabVendorsNotice:
					'Þessir samstarfsaðilar eru skráðir hjá IAB Transparency & Consent Framework (TCF), iðnaðarstaðli til að stjórna samþykki',
				legitimateInterest: 'Lögm. hagsmunir',
				maxAge: 'Hámarksaldur: {days}d',
				nonCookieAccess: 'Aðgangur án vafrakaka',
				privacyPolicy: 'Persónuverndarstefna',
				purposes: 'Tilgangur',
				requiredNotice:
					'Nauðsynlegt fyrir virkni vefsins, ekki hægt að slökkva á',
				retention: 'Varðveisla: {days}d',
				search: 'Leita að söluaðilum...',
				showingCount: '{filtered} af {total} söluaðilum',
				specialFeatures: 'Sérstakir eiginleikar',
				specialPurposes: 'Sérstakur tilgangur',
				storageDisclosure: 'Upplýsingar um geymslu',
				usesCookies: 'Notar vafrakökur',
			},
		},
	},
	legalLinks: {
		cookiePolicy: 'Stefna um vafrakökur',
		privacyPolicy: 'Persónuverndarstefna',
		termsOfService: 'Þjónustuskilmálar',
	},
};
export default translations;
