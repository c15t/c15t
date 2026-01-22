import type { CompleteTranslations } from '../types';
export const translations: CompleteTranslations = {
	common: {
		acceptAll: 'Derbyn pob un',
		rejectAll: 'Gwrthod pob un',
		customize: 'Addasu',
		save: 'Cadw gosodiadau',
	},
	cookieBanner: {
		title: 'Rydym yn gwerthfawrogi eich preifatrwydd',
		description:
			"Mae'r wefan hon yn defnyddio cwcis i wella eich profiad pori, dadansoddi traffig y wefan, a dangos cynnwys wedi'i bersonoli.",
	},
	consentManagerDialog: {
		title: 'Gosodiadau preifatrwydd',
		description:
			'Addaswch eich gosodiadau preifatrwydd yma. Gallwch ddewis pa fathau o gwcis a thechnolegau tracio rydych yn eu caniatáu.',
	},
	consentTypes: {
		necessary: {
			title: 'Cwbl angenrheidiol',
			description:
				"Mae'r cwcis hyn yn hanfodol i'r wefan weithredu'n iawn ac ni ellir eu hanalluogi.",
		},
		functionality: {
			title: 'Swyddogaeth',
			description:
				"Mae'r cwcis hyn yn galluogi swyddogaeth a phersonoli gwell o'r wefan.",
		},
		marketing: {
			title: 'Marchnata',
			description:
				'Defnyddir y cwcis hyn i ddarparu hysbysebion perthnasol a thracio eu heffeithiolrwydd.',
		},
		measurement: {
			title: 'Dadansoddeg',
			description:
				"Mae'r cwcis hyn yn ein helpu i ddeall sut mae ymwelwyr yn rhyngweithio â'r wefan a gwella ei pherfformiad.",
		},
		experience: {
			title: 'Profiad',
			description:
				"Mae'r cwcis hyn yn ein helpu i ddarparu profiad defnyddiwr gwell a phrofi nodweddion newydd.",
		},
	},
	frame: {
		title: 'Derbyn caniatâd {category} i weld y cynnwys hwn.',
		actionButton: 'Galluogi caniatâd {category}',
	},
	legalLinks: {
		privacyPolicy: 'Polisi preifatrwydd',
		cookiePolicy: 'Polisi cwcis',
		termsOfService: 'Telerau gwasanaeth',
	},
	iab: {
		banner: {
			title: 'Gosodiadau preifatrwydd',
			description:
				'Rydym ni a’n {partnerCount} partner yn storio a/neu’n cyrchu gwybodaeth ar eich dyfais ac yn prosesu data personol, megis dynodwyr unigryw a data pori, ar gyfer y wefan hon, er mwyn:',
			partnersLink: '{count} partner',
			andMore: 'Ac {count} arall...',
			legitimateInterestNotice:
				'Mae rhai partneriaid yn hawlio buddiant cyfreithlon i brosesu eich data. Mae gennych hawl i wrthwynebu’r prosesu hwn, addasu eich dewisiadau, a thynnu eich cydsyniad yn ôl unrhyw bryd.',
		},
		preferenceCenter: {
			title: 'Gosodiadau preifatrwydd',
			description:
				'Addaswch eich gosodiadau preifatrwydd yma. Gallwch ddewis pa fathau o gwcis a thechnolegau tracio rydych yn eu caniatáu.',
			tabs: {
				purposes: 'Dibenion',
				vendors: 'Gwerthwyr',
			},
			purposeItem: {
				partners: '{count} partner',
				vendorsUseLegitimateInterest:
					'{count} gwerthwr yn hawlio buddiant cyfreithlon',
				examples: 'Enghreifftiau',
				partnersUsingPurpose: 'Partneriaid sy’n Defnyddio’r Diben Hwn',
				withYourPermission: 'Gyda’ch Caniatâd',
				legitimateInterest: 'Buddiant Cyfreithlon',
				objectButton: 'Gwrthwynebu',
				objected: 'Gwrthwynebwyd',
				rightToObject:
					'Mae gennych hawl i wrthwynebu prosesu sy’n seiliedig ar fuddiant cyfreithlon.',
			},
			specialPurposes: {
				title: 'Swyddogaethau Hanfodol (Angenrheidiol)',
				tooltip:
					'Mae’r rhain yn angenrheidiol ar gyfer swyddogaethau a diogelwch y wefan. Yn unol ag IAB TCF, ni allwch wrthwynebu’r dibenion arbennig hyn.',
			},
			vendorList: {
				search: 'Chwilio gwerthwyr...',
				showingCount: '{filtered} o {total} gwerthwr',
				iabVendorsHeading: 'Gwerthwyr Cofrestredig IAB',
				iabVendorsNotice:
					'Mae’r partneriaid hyn wedi’u cofrestru gyda Fframwaith Tryloywder a Chydsyniad (TCF) yr IAB, safon diwydiant ar gyfer rheoli cydsyniad',
				customVendorsHeading: 'Partneriaid Personol',
				customVendorsNotice:
					'Partneriaid personol yw’r rhain nad ydynt wedi’u cofrestru gyda Fframwaith Tryloywder a Chydsyniad (TCF) yr IAB. Maent yn prosesu data yn seiliedig ar eich cydsyniad ac fe allant fod ag arferion preifatrwydd gwahanol i werthwyr cofrestredig IAB.',
				purposes: 'Dibenion',
				specialPurposes: 'Dibenion Arbennig',
				specialFeatures: 'Nodweddion Arbennig',
				dataCategories: 'Categorïau Data',
				usesCookies: 'Yn Defnyddio Cwcis',
				nonCookieAccess: 'Mynediad Heb Gwcis',
				maxAge: 'Oed Uchaf: {days}d',
				legitimateInterest: 'Buddiant Cyf.',
				privacyPolicy: 'Polisi Preifatrwydd',
				storageDisclosure: 'Datgelu Storio',
				requiredNotice:
					'Angenrheidiol ar gyfer swyddogaeth y wefan, ni ellir ei analluogi',
			},
			footer: {
				consentStorage:
					'Mae dewisiadau cydsyniad yn cael eu storio mewn cwci o’r enw "euconsent-v2" am 13 mis.',
			},
		},
		common: {
			acceptAll: 'Derbyn pob un',
			rejectAll: 'Gwrthod pob un',
			customize: 'Addasu',
			saveSettings: 'Cadw gosodiadau',
			loading: 'Wrthi’n llwytho...',
			showingSelectedVendor: 'Yn dangos y gwerthwr a ddewiswyd',
			clearSelection: 'Clirio',
			customPartner: 'Partner personol heb ei gofrestru gyda’r IAB',
		},
	},
};
export default translations;
