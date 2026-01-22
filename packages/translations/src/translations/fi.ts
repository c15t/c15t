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
	iab: {
		banner: {
			title: 'Tietosuoja-asetukset',
			description:
				'Me ja {partnerCount} kumppaniamme tallennamme ja/tai käytämme tietoja laitteellasi ja käsittelemme henkilötietoja, kuten yksilöllisiä tunnisteita ja selaustietoja, tällä verkkosivustolla seuraaviin tarkoituksiin:',
			partnersLink: '{count} kumppania',
			andMore: 'Ja {count} muuta...',
			legitimateInterestNotice:
				'Jotkut kumppanit vetoavat oikeutettuun etuun tietojesi käsittelyssä. Sinulla on oikeus vastustaa tätä käsittelyä, mukauttaa valintojasi ja peruuttaa suostumuksesi milloin tahansa.',
		},
		preferenceCenter: {
			title: 'Tietosuoja-asetukset',
			description:
				'Mukauta yksityisyysasetuksiasi täällä. Voit valita, minkä tyyppiset evästeet ja seurantatekniikat sallit.',
			tabs: {
				purposes: 'Käyttötarkoitukset',
				vendors: 'Kumppanit',
			},
			purposeItem: {
				partners: '{count} kumppania',
				vendorsUseLegitimateInterest:
					'{count} kumppania vetoaa oikeutettuun etuun',
				examples: 'Esimerkit',
				partnersUsingPurpose: 'Tätä käyttötarkoitusta käyttävät kumppanit',
				withYourPermission: 'Luvallasi',
				legitimateInterest: 'Oikeutettu etu',
				objectButton: 'Vastusta',
				objected: 'Vastustettu',
				rightToObject:
					'Sinulla on oikeus vastustaa oikeutettuun etuun perustuvaa käsittelyä.',
			},
			specialPurposes: {
				title: 'Välttämättömät toiminnot (pakollinen)',
				tooltip:
					'Nämä ovat välttämättömiä sivuston toimivuuden ja turvallisuuden kannalta. IAB TCF:n mukaan et voi vastustaa näitä erityisiä käyttötarkoituksia.',
			},
			vendorList: {
				search: 'Hae kumppaneita...',
				showingCount: '{filtered}/{total} kumppania',
				iabVendorsHeading: 'IAB-rekisteröidyt kumppanit',
				iabVendorsNotice:
					'Nämä kumppanit on rekisteröity IAB Transparency & Consent Framework (TCF) -järjestelmään, joka on alan standardi suostumusten hallintaan',
				customVendorsHeading: 'Mukautetut kumppanit',
				customVendorsNotice:
					'Nämä ovat mukautettuja kumppaneita, jotka eivät ole rekisteröityneet IAB Transparency & Consent Framework (TCF) -järjestelmään. Ne käsittelevät tietoja suostumuksesi perusteella, ja niillä voi olla erilaiset tietosuojakäytännöt kuin IAB:hen rekisteröityneillä toimittajilla.',
				purposes: 'Tarkoitukset',
				specialPurposes: 'Erityistarkoitukset',
				specialFeatures: 'Erikoisominaisuudet',
				dataCategories: 'Tietoluokat',
				usesCookies: 'Käyttää evästeitä',
				nonCookieAccess: 'Muu kuin evästepohjainen käyttö',
				maxAge: 'Enimmäisikä: {days} pv',
				legitimateInterest: 'Oikeutettu etu',
				privacyPolicy: 'Tietosuojakäytäntö',
				storageDisclosure: 'Tallennustietojen julkistaminen',
				requiredNotice:
					'Vaaditaan sivuston toiminnallisuuden vuoksi, ei voi poistaa käytöstä',
			},
			footer: {
				consentStorage:
					'Suostumusasetukset tallennetaan evästeeseen nimeltä "euconsent-v2" 13 kuukaudeksi.',
			},
		},
		common: {
			acceptAll: 'Hyväksy kaikki',
			rejectAll: 'Hylkää kaikki',
			customize: 'Mukauta',
			saveSettings: 'Tallenna asetukset',
			loading: 'Ladataan...',
			showingSelectedVendor: 'Näytetään valittu toimittaja',
			clearSelection: 'Tyhjennä',
			customPartner: 'Mukautettu kumppani, joka ei ole rekisteröitynyt IAB:hen',
		},
	},
};
export default translations;
