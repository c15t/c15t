import type { CompleteTranslations } from '../types';
export const translations: CompleteTranslations = {
	common: {
		acceptAll: 'Priimti visus',
		rejectAll: 'Atmesti visus',
		customize: 'Tinkinti',
		save: 'Išsaugoti nustatymus',
	},
	cookieBanner: {
		title: 'Mes vertiname jūsų privatumą',
		description:
			'Ši svetainė naudoja slapukus naršymo patirčiai gerinti, svetainės srautui analizuoti ir rodyti jums pritaikytą turinį.',
	},
	consentManagerDialog: {
		title: 'Privatumo nustatymai',
		description:
			'Čia galite tinkinti savo privatumo nustatymus. Galite pasirinkti, kokių tipų slapukus ir sekimo technologijas leidžiate naudoti.',
	},
	consentTypes: {
		necessary: {
			title: 'Būtinieji',
			description:
				'Šie slapukai yra būtini tinkamam svetainės veikimui ir negali būti išjungti.',
		},
		functionality: {
			title: 'Funkcionalumo',
			description:
				'Šie slapukai įgalina išplėstinį funkcionalumą ir svetainės personalizavimą.',
		},
		marketing: {
			title: 'Rinkodaros',
			description:
				'Šie slapukai naudojami pateikti aktualius skelbimus ir sekti jų efektyvumą.',
		},
		measurement: {
			title: 'Analitikos',
			description:
				'Šie slapukai padeda mums suprasti, kaip lankytojai sąveikauja su svetaine, ir pagerinti jos veikimą.',
		},
		experience: {
			title: 'Patirties',
			description:
				'Šie slapukai padeda mums užtikrinti geresnę vartotojo patirtį ir išbandyti naujas funkcijas.',
		},
	},
	frame: {
		title:
			'Priimkite {category} sutikimą, kad galėtumėte peržiūrėti šį turinį.',
		actionButton: 'Įgalinti {category} sutikimą',
	},
	legalLinks: {
		privacyPolicy: 'Privatumo politika',
		cookiePolicy: 'Slapukų politika',
		termsOfService: 'Naudojimosi sąlygos',
	},
	iab: {
		banner: {
			title: 'Privatumo nustatymai',
			description:
				'Mes ir mūsų {partnerCount} partneriai saugome ir (arba) pasiekiame informaciją jūsų įrenginyje ir tvarkome asmens duomenis, tokius kaip unikalūs identifikatoriai ir naršymo duomenys, šioje svetainėje, kad galėtume:',
			partnersLink: '{count} partneriai',
			andMore: 'Ir dar {count}...',
			legitimateInterestNotice:
				'Kai kurie partneriai teigia turintys teisėtą interesą tvarkyti jūsų duomenis. Jūs turite teisę nesutikti su tokiu tvarkymu, tinkinti savo pasirinkimus ir bet kada atšaukti sutikimą.',
		},
		preferenceCenter: {
			title: 'Privatumo nustatymai',
			description:
				'Čia galite tinkinti savo privatumo nustatymus. Galite pasirinkti, kokių tipų slapukus ir sekimo technologijas leidžiate naudoti.',
			tabs: {
				purposes: 'Tikslai',
				vendors: 'Tiekėjai',
			},
			purposeItem: {
				partners: '{count} partneriai',
				vendorsUseLegitimateInterest:
					'{count} tiekėjai teigia turintys teisėtą interesą',
				examples: 'Pavyzdžiai',
				partnersUsingPurpose: 'Partneriai, naudojantys šį tikslą',
				withYourPermission: 'Su jūsų leidimu',
				legitimateInterest: 'Teisėtas interesas',
				objectButton: 'Nesutikti',
				objected: 'Prieštarauta',
				rightToObject:
					'Jūs turite teisę nesutikti su tvarkymu, pagrįstu teisėtu interesu.',
			},
			specialPurposes: {
				title: 'Esminės funkcijos (privaloma)',
				tooltip:
					'Jos reikalingos svetainės funkcionalumui ir saugumui užtikrinti. Pagal IAB TCF negalite nesutikti su šiais specialiais tikslais.',
			},
			vendorList: {
				search: 'Ieškoti tiekėjų...',
				showingCount: 'Rodoma {filtered} iš {total} tiekėjų',
				iabVendorsHeading: 'IAB registruoti tiekėjai',
				iabVendorsNotice:
					'Šie partneriai yra užregistruoti IAB Transparency & Consent Framework (TCF) – pramonės standarte, skirtame sutikimų valdymui',
				customVendorsHeading: 'Pasirinktiniai partneriai',
				customVendorsNotice:
					'Tai yra pasirinktiniai partneriai, kurie nėra užregistruoti IAB Transparency & Consent Framework (TCF). Jie tvarko duomenis remdamiesi jūsų sutikimu ir gali taikyti kitokią privatumo praktiką nei IAB registruoti tiekėjai.',
				purposes: 'Tikslai',
				specialPurposes: 'Specialūs tikslai',
				specialFeatures: 'Specialios funkcijos',
				dataCategories: 'Duomenų kategorijos',
				usesCookies: 'Naudoja slapukus',
				nonCookieAccess: 'Prieiga be slapukų',
				maxAge: 'Maks. amžius: {days}d',
				legitimateInterest: 'Teisėtas int.',
				privacyPolicy: 'Privatumo politika',
				storageDisclosure: 'Informacija apie saugojimą',
				requiredNotice:
					'Reikalinga svetainės funkcionalumui, negalima išjungti',
			},
			footer: {
				consentStorage:
					'Sutikimo nuostatos saugomos slapuke pavadinimu „euconsent-v2“ 13 mėnesių.',
			},
		},
		common: {
			acceptAll: 'Priimti visus',
			rejectAll: 'Atmesti visus',
			customize: 'Tinkinti',
			saveSettings: 'Išsaugoti nustatymus',
			loading: 'Įkeliama...',
			showingSelectedVendor: 'Rodomas pasirinktas tiekėjas',
			clearSelection: 'Išvalyti',
			customPartner: 'Pasirinktinis partneris, neįregistruotas IAB',
		},
	},
};
export default translations;
