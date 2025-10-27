import type { CompleteTranslations } from '../types';

export const fiTranslations: CompleteTranslations = {
	common: {
		acceptAll: 'Hyväksy kaikki',
		rejectAll: 'Hylkää kaikki',
		customize: 'Mukauta',
		save: 'Tallenna asetukset',
	},
	cookieBanner: {
		title: 'Arvostamme yksityisyyttäsi',
		description:
			'Tämä sivusto käyttää evästeitä parantaakseen selaamiskokemustasi, analysoidakseen sivuston liikennettä ja näyttääkseen henkilökohtaista sisältöä.',
	},
	consentManagerDialog: {
		title: 'Yksityisyysasetukset',
		description:
			'Mukauta yksityisyysasetuksiasi täällä. Voit valita, minkä tyyppisiä evästeitä ja seurantateknologioita sallit.',
	},
	consentTypes: {
		necessary: {
			title: 'Välttämättömät',
			description:
				'Nämä evästeet ovat välttämättömiä verkkosivuston asianmukaiselle toiminnalle, eikä niitä voi poistaa käytöstä.',
		},
		functionality: {
			title: 'Toiminnallisuus',
			description:
				'Nämä evästeet mahdollistavat verkkosivuston parannetun toiminnallisuuden ja personoinnin.',
		},
		marketing: {
			title: 'Markkinointi',
			description:
				'Näitä evästeitä käytetään asiaankuuluvan mainonnan toimittamiseen ja niiden tehokkuuden seuraamiseen.',
		},
		measurement: {
			title: 'Analytiikka',
			description:
				'Nämä evästeet auttavat meitä ymmärtämään, miten vierailijat ovat vuorovaikutuksessa verkkosivuston kanssa ja parantamaan sen suorituskykyä.',
		},
		experience: {
			title: 'Kokemus',
			description:
				'Nämä evästeet auttavat meitä tarjoamaan paremman käyttökokemuksen ja testaamaan uusia ominaisuuksia.',
		},
	},
	frame: {
		title: 'Hyväksy {category} nähdäksesi tämän sisällön.',
		actionButton: 'Ota käyttöön {category} suostumus',
	},
	legalLinks: {
		privacyPolicy: 'Tietosuojakäytäntö',
		cookiePolicy: 'Evästekäytäntö',
		termsOfService: 'Käyttöehdot',
	},
};
