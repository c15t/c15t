import type { CompleteTranslations } from '../types';

export const translations: CompleteTranslations = {
	common: {
		acceptAll: 'Hyväksy kaikki',
		close: 'Sulje',
		customize: 'Mukauta',
		rejectAll: 'Hylkää kaikki',
		save: 'Tallenna asetukset',
		securedBy: 'Suojauksen tarjoaa',
	},
	consentManagerDialog: {
		description:
			'Mukauta yksityisyysasetuksiasi täällä. Voit valita, minkä tyyppiset evästeet ja seurantatekniikat sallit.',
		title: 'Tietosuoja-asetukset',
	},
	consentTypes: {
		experience: {
			description:
				'Nämä evästeet auttavat meitä tarjoamaan paremman käyttökokemuksen ja testaamaan uusia ominaisuuksia.',
			title: 'Kokemus',
		},
		functionality: {
			description:
				'Nämä evästeet mahdollistavat verkkosivuston tehostetun toiminnallisuuden ja personoinnin.',
			title: 'Toiminnallisuus',
		},
		marketing: {
			description:
				'Näitä evästeitä käytetään relevanttien mainosten lähettämiseen ja niiden tehokkuuden seurantaan.',
			title: 'Markkinointi',
		},
		measurement: {
			description:
				'Nämä evästeet auttavat meitä ymmärtämään, miten kävijät ovat vuorovaikutuksessa verkkosivuston kanssa, ja parantamaan sen suorituskykyä.',
			title: 'Analytiikka',
		},
		necessary: {
			description:
				'Nämä evästeet ovat välttämättömiä, jotta verkkosivusto toimisi oikein, eikä niitä voi poistaa käytöstä.',
			title: 'Ehdottoman tarpeellinen',
		},
	},
	cookieBanner: {
		description:
			'Tämä sivusto käyttää evästeitä parantaakseen selauskokemustasi, analysoidakseen sivuston liikennettä ja näyttääkseen yksilöllistä sisältöä.',
		title: 'Arvostamme yksityisyyttäsi',
	},
	frame: {
		actionButton: 'Ota {category} käyttöön',
		error: 'This content could not be loaded.',
		loading: 'Loading content…',
		policyBlocked:
			"This content is unavailable under your region's consent policy.",
		title: 'Hyväksy {category}, jotta voit tarkastella tätä sisältöä.',
	},
	iab: {
		banner: {
			andMore: 'Ja {count} muuta...',
			description:
				'Me ja {partnerCount} kumppaniamme tallennamme ja/tai käytämme tietoja laitteellasi ja käsittelemme henkilötietoja, kuten yksilöllisiä tunnisteita ja selaustietoja, tällä verkkosivustolla seuraaviin tarkoituksiin:',
			legitimateInterestNotice:
				'Jotkut kumppanit vetoavat oikeutettuun etuun tietojesi käsittelyssä. Sinulla on oikeus vastustaa tätä käsittelyä, mukauttaa valintojasi ja peruuttaa suostumuksesi milloin tahansa.',
			partnersLink: '{count} kumppania',
			scopeGroup: 'Valintasi koskee kaikkia verkkosivujamme tässä ryhmässä.',
			scopeServiceSpecific:
				'Suostumuksesi koskee vain tätä verkkosivustoa eikä vaikuta muihin palveluihin.',
			title: 'Tietosuoja-asetukset',
		},
		common: {
			acceptAll: 'Hyväksy kaikki',
			clearSelection: 'Tyhjennä',
			customPartner: 'Mukautettu kumppani, joka ei ole rekisteröitynyt IAB:hen',
			customize: 'Mukauta',
			loading: 'Ladataan...',
			rejectAll: 'Hylkää kaikki',
			saveSettings: 'Tallenna asetukset',
			showingSelectedVendor: 'Näytetään valittu toimittaja',
		},
		preferenceCenter: {
			description:
				'Mukauta yksityisyysasetuksiasi täällä. Voit valita, minkä tyyppiset evästeet ja seurantatekniikat sallit.',
			footer: {
				consentStorage:
					'Suostumusasetukset tallennetaan evästeeseen nimeltä "euconsent-v2" 13 kuukaudeksi. Säilytysaika voi alkaa alusta, kun päivität asetuksiasi.',
			},
			purposeItem: {
				examples: 'Esimerkit',
				legitimateInterest: 'Oikeutettu etu',
				objectButton: 'Vastusta',
				objected: 'Vastustettu',
				partners: '{count} kumppania',
				partnersUsingPurpose: 'Tätä käyttötarkoitusta käyttävät kumppanit',
				rightToObject:
					'Sinulla on oikeus vastustaa oikeutettuun etuun perustuvaa käsittelyä.',
				vendorsUseLegitimateInterest:
					'{count} kumppania vetoaa oikeutettuun etuun',
				withYourPermission: 'Luvallasi',
			},
			specialPurposes: {
				title: 'Välttämättömät toiminnot (pakollinen)',
				tooltip:
					'Nämä ovat välttämättömiä sivuston toimivuuden ja turvallisuuden kannalta. IAB TCF:n mukaan et voi vastustaa näitä erityisiä käyttötarkoituksia.',
			},
			tabs: {
				purposes: 'Käyttötarkoitukset',
				vendors: 'Kumppanit',
			},
			title: 'Tietosuoja-asetukset',
			vendorList: {
				customVendorsHeading: 'Mukautetut kumppanit',
				customVendorsNotice:
					'Nämä ovat mukautettuja kumppaneita, jotka eivät ole rekisteröityneet IAB Transparency & Consent Framework (TCF) -järjestelmään. Ne käsittelevät tietoja suostumuksesi perusteella, ja niillä voi olla erilaiset tietosuojakäytännöt kuin IAB:hen rekisteröityneillä toimittajilla.',
				dataCategories: 'Tietoluokat',
				features: 'Ominaisuudet',
				iabVendorsHeading: 'IAB-rekisteröidyt kumppanit',
				iabVendorsNotice:
					'Nämä kumppanit on rekisteröity IAB Transparency & Consent Framework (TCF) -järjestelmään, joka on alan standardi suostumusten hallintaan',
				legitimateInterest: 'Oikeutettu etu',
				maxAge: 'Enimmäisikä: {days} pv',
				nonCookieAccess: 'Muu kuin evästepohjainen käyttö',
				privacyPolicy: 'Tietosuojakäytäntö',
				purposes: 'Tarkoitukset',
				requiredNotice:
					'Vaaditaan sivuston toiminnallisuuden vuoksi, ei voi poistaa käytöstä',
				retention: 'Säilytys: {days} pv',
				search: 'Hae kumppaneita...',
				showingCount: '{filtered}/{total} kumppania',
				specialFeatures: 'Erikoisominaisuudet',
				specialPurposes: 'Erityistarkoitukset',
				storageDisclosure: 'Tallennustietojen julkistaminen',
				usesCookies: 'Käyttää evästeitä',
			},
		},
	},
	legalLinks: {
		cookiePolicy: 'Evästekäytäntö',
		privacyPolicy: 'Tietosuojakäytäntö',
		termsOfService: 'Käyttöehdot',
	},
};
export default translations;
