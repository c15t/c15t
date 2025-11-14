import type { CompleteTranslations } from '../types';
export const translations: CompleteTranslations = {
	common: {
		acceptAll: 'Hyväksy kaikki',
		rejectAll: 'Hylkää kaikki',
		customize: 'Mukauta',
		save: 'Tallenna asetukset',
	},
	cookieBanner: {
		title: 'Arvostamme yksityisyyttäsi',
		description:
			'Tämä sivusto käyttää evästeitä parantaakseen selauskokemustasi, analysoidakseen sivuston liikennettä ja näyttääkseen yksilöllistä sisältöä.',
	},
	consentManagerDialog: {
		title: 'Tietosuoja-asetukset',
		description:
			'Mukauta yksityisyysasetuksiasi täällä. Voit valita, minkä tyyppiset evästeet ja seurantatekniikat sallit.',
	},
	consentTypes: {
		necessary: {
			title: 'Ehdottoman tarpeellinen',
			description:
				'Nämä evästeet ovat välttämättömiä, jotta verkkosivusto toimisi oikein, eikä niitä voi poistaa käytöstä.',
		},
		functionality: {
			title: 'Toiminnallisuus',
			description:
				'Nämä evästeet mahdollistavat verkkosivuston tehostetun toiminnallisuuden ja personoinnin.',
		},
		marketing: {
			title: 'Markkinointi',
			description:
				'Näitä evästeitä käytetään relevanttien mainosten lähettämiseen ja niiden tehokkuuden seurantaan.',
		},
		measurement: {
			title: 'Analytiikka',
			description:
				'Nämä evästeet auttavat meitä ymmärtämään, miten kävijät ovat vuorovaikutuksessa verkkosivuston kanssa, ja parantamaan sen suorituskykyä.',
		},
		experience: {
			title: 'Kokemus',
			description:
				'Nämä evästeet auttavat meitä tarjoamaan paremman käyttökokemuksen ja testaamaan uusia ominaisuuksia.',
		},
	},
	frame: {
		title: 'Hyväksy {category}, jotta voit tarkastella tätä sisältöä.',
		actionButton: 'Ota {category} käyttöön',
	},
	legalLinks: {
		privacyPolicy: 'Tietosuojakäytäntö',
		cookiePolicy: 'Evästekäytäntö',
		termsOfService: 'Käyttöehdot',
	},
};
export default translations;
