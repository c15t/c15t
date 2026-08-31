import type { CompleteTranslations } from '../types';

export const translations: CompleteTranslations = {
	common: {
		acceptAll: 'Derbyn pob un',
		close: 'Cau',
		customize: 'Addasu',
		rejectAll: 'Gwrthod pob un',
		save: 'Cadw gosodiadau',
		securedBy: "Wedi'i ddiogelu gan",
	},
	consentManagerDialog: {
		description:
			'Addaswch eich gosodiadau preifatrwydd yma. Gallwch ddewis pa fathau o gwcis a thechnolegau tracio rydych yn eu caniatáu.',
		title: 'Gosodiadau preifatrwydd',
	},
	consentTypes: {
		experience: {
			description:
				"Mae'r cwcis hyn yn ein helpu i ddarparu profiad defnyddiwr gwell a phrofi nodweddion newydd.",
			title: 'Profiad',
		},
		functionality: {
			description:
				"Mae'r cwcis hyn yn galluogi swyddogaeth a phersonoli gwell o'r wefan.",
			title: 'Swyddogaeth',
		},
		marketing: {
			description:
				'Defnyddir y cwcis hyn i ddarparu hysbysebion perthnasol a thracio eu heffeithiolrwydd.',
			title: 'Marchnata',
		},
		measurement: {
			description:
				"Mae'r cwcis hyn yn ein helpu i ddeall sut mae ymwelwyr yn rhyngweithio â'r wefan a gwella ei pherfformiad.",
			title: 'Dadansoddeg',
		},
		necessary: {
			description:
				"Mae'r cwcis hyn yn hanfodol i'r wefan weithredu'n iawn ac ni ellir eu hanalluogi.",
			title: 'Cwbl angenrheidiol',
		},
	},
	cookieBanner: {
		description:
			"Mae'r wefan hon yn defnyddio cwcis i wella eich profiad pori, dadansoddi traffig y wefan, a dangos cynnwys wedi'i bersonoli.",
		title: 'Rydym yn gwerthfawrogi eich preifatrwydd',
	},
	frame: {
		actionButton: 'Galluogi caniatâd {category}',
		error: 'This content could not be loaded.',
		loading: 'Loading content…',
		policyBlocked:
			"This content is unavailable under your region's consent policy.",
		title: 'Derbyn caniatâd {category} i weld y cynnwys hwn.',
	},
	iab: {
		banner: {
			andMore: 'Ac {count} arall...',
			description:
				'Rydym ni a’n {partnerCount} partner yn storio a/neu’n cyrchu gwybodaeth ar eich dyfais ac yn prosesu data personol, megis dynodwyr unigryw a data pori, ar gyfer y wefan hon, er mwyn:',
			legitimateInterestNotice:
				'Mae rhai partneriaid yn hawlio buddiant cyfreithlon i brosesu eich data. Mae gennych hawl i wrthwynebu’r prosesu hwn, addasu eich dewisiadau, a thynnu eich cydsyniad yn ôl unrhyw bryd.',
			partnersLink: '{count} partner',
			scopeGroup:
				'Mae eich dewis yn berthnasol ar draws ein gwefannau yn y grŵp hwn.',
			scopeServiceSpecific:
				'Mae eich caniatâd yn berthnasol i’r wefan hon yn unig ac ni fydd yn effeithio ar wasanaethau eraill.',
			title: 'Gosodiadau preifatrwydd',
		},
		common: {
			acceptAll: 'Derbyn pob un',
			clearSelection: 'Clirio',
			customPartner: 'Partner personol heb ei gofrestru gyda’r IAB',
			customize: 'Addasu',
			loading: 'Wrthi’n llwytho...',
			rejectAll: 'Gwrthod pob un',
			saveSettings: 'Cadw gosodiadau',
			showingSelectedVendor: 'Yn dangos y gwerthwr a ddewiswyd',
		},
		preferenceCenter: {
			description:
				'Addaswch eich gosodiadau preifatrwydd yma. Gallwch ddewis pa fathau o gwcis a thechnolegau tracio rydych yn eu caniatáu.',
			footer: {
				consentStorage:
					'Mae dewisiadau cydsyniad yn cael eu storio mewn cwci o’r enw "euconsent-v2" am 13 mis. Gall y cyfnod storio gael ei adnewyddu pan fyddwch yn diweddaru eich dewisiadau.',
			},
			purposeItem: {
				examples: 'Enghreifftiau',
				legitimateInterest: 'Buddiant Cyfreithlon',
				objectButton: 'Gwrthwynebu',
				objected: 'Gwrthwynebwyd',
				partners: '{count} partner',
				partnersUsingPurpose: 'Partneriaid sy’n Defnyddio’r Diben Hwn',
				rightToObject:
					'Mae gennych hawl i wrthwynebu prosesu sy’n seiliedig ar fuddiant cyfreithlon.',
				vendorsUseLegitimateInterest:
					'{count} gwerthwr yn hawlio buddiant cyfreithlon',
				withYourPermission: 'Gyda’ch Caniatâd',
			},
			specialPurposes: {
				title: 'Swyddogaethau Hanfodol (Angenrheidiol)',
				tooltip:
					'Mae’r rhain yn angenrheidiol ar gyfer swyddogaethau a diogelwch y wefan. Yn unol ag IAB TCF, ni allwch wrthwynebu’r dibenion arbennig hyn.',
			},
			tabs: {
				purposes: 'Dibenion',
				vendors: 'Gwerthwyr',
			},
			title: 'Gosodiadau preifatrwydd',
			vendorList: {
				customVendorsHeading: 'Partneriaid Personol',
				customVendorsNotice:
					'Partneriaid personol yw’r rhain nad ydynt wedi’u cofrestru gyda Fframwaith Tryloywder a Chydsyniad (TCF) yr IAB. Maent yn prosesu data yn seiliedig ar eich cydsyniad ac fe allant fod ag arferion preifatrwydd gwahanol i werthwyr cofrestredig IAB.',
				dataCategories: 'Categorïau Data',
				features: 'Nodweddion',
				iabVendorsHeading: 'Gwerthwyr Cofrestredig IAB',
				iabVendorsNotice:
					'Mae’r partneriaid hyn wedi’u cofrestru gyda Fframwaith Tryloywder a Chydsyniad (TCF) yr IAB, safon diwydiant ar gyfer rheoli cydsyniad',
				legitimateInterest: 'Buddiant Cyf.',
				maxAge: 'Oed Uchaf: {days}d',
				nonCookieAccess: 'Mynediad Heb Gwcis',
				privacyPolicy: 'Polisi Preifatrwydd',
				purposes: 'Dibenion',
				requiredNotice:
					'Angenrheidiol ar gyfer swyddogaeth y wefan, ni ellir ei analluogi',
				retention: 'Cadw: {days}d',
				search: 'Chwilio gwerthwyr...',
				showingCount: '{filtered} o {total} gwerthwr',
				specialFeatures: 'Nodweddion Arbennig',
				specialPurposes: 'Dibenion Arbennig',
				storageDisclosure: 'Datgelu Storio',
				usesCookies: 'Yn Defnyddio Cwcis',
			},
		},
	},
	legalLinks: {
		cookiePolicy: 'Polisi cwcis',
		privacyPolicy: 'Polisi preifatrwydd',
		termsOfService: 'Telerau gwasanaeth',
	},
};
export default translations;
