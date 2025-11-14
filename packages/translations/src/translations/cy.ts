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
};
export default translations;
