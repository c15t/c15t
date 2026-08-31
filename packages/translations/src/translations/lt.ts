import type { CompleteTranslations } from '../types';

export const translations: CompleteTranslations = {
	common: {
		acceptAll: 'Priimti visus',
		close: 'Uždaryti',
		customize: 'Rinktis',
		rejectAll: 'Atmesti visus',
		save: 'Išsaugoti nustatymus',
		securedBy: 'Apsaugą teikia',
	},
	consentManagerDialog: {
		description:
			'Čia galite tinkinti savo privatumo nustatymus. Galite pasirinkti, kokių tipų slapukus ir sekimo technologijas leidžiate naudoti.',
		title: 'Privatumo nustatymai',
	},
	consentTypes: {
		experience: {
			description:
				'Šie slapukai padeda mums užtikrinti geresnę vartotojo patirtį ir išbandyti naujas funkcijas.',
			title: 'Patirties',
		},
		functionality: {
			description:
				'Šie slapukai įgalina išplėstinį funkcionalumą ir svetainės personalizavimą.',
			title: 'Funkcionalumo',
		},
		marketing: {
			description:
				'Šie slapukai naudojami pateikti aktualius skelbimus ir sekti jų efektyvumą.',
			title: 'Rinkodaros',
		},
		measurement: {
			description:
				'Šie slapukai padeda mums suprasti, kaip lankytojai sąveikauja su svetaine, ir pagerinti jos veikimą.',
			title: 'Analitikos',
		},
		necessary: {
			description:
				'Šie slapukai yra būtini tinkamam svetainės veikimui ir negali būti išjungti.',
			title: 'Būtinieji',
		},
	},
	cookieBanner: {
		description:
			'Ši svetainė naudoja slapukus naršymo patirčiai gerinti, svetainės srautui analizuoti ir rodyti jums pritaikytą turinį.',
		title: 'Mes vertiname jūsų privatumą',
	},
	frame: {
		actionButton: 'Įgalinti {category} sutikimą',
		error: 'This content could not be loaded.',
		loading: 'Loading content…',
		policyBlocked:
			"This content is unavailable under your region's consent policy.",
		title:
			'Priimkite {category} sutikimą, kad galėtumėte peržiūrėti šį turinį.',
	},
	iab: {
		banner: {
			andMore: 'Ir dar {count}...',
			description:
				'Mes ir mūsų {partnerCount} partneriai saugome ir (arba) pasiekiame informaciją jūsų įrenginyje ir tvarkome asmens duomenis, tokius kaip unikalūs identifikatoriai ir naršymo duomenys, šioje svetainėje, kad galėtume:',
			legitimateInterestNotice:
				'Kai kurie partneriai teigia turintys teisėtą interesą tvarkyti jūsų duomenis. Jūs turite teisę nesutikti su tokiu tvarkymu, tinkinti savo pasirinkimus ir bet kada atšaukti sutikimą.',
			partnersLink: '{count} partneriai',
			scopeGroup:
				'Jūsų pasirinkimas taikomas visoms mūsų svetainėms šioje grupėje.',
			scopeServiceSpecific:
				'Jūsų sutikimas taikomas tik šiai svetainei ir neturės įtakos kitoms paslaugoms.',
			title: 'Privatumo nustatymai',
		},
		common: {
			acceptAll: 'Priimti visus',
			clearSelection: 'Išvalyti',
			customPartner: 'Pasirinktinis partneris, neįregistruotas IAB',
			customize: 'Rinktis',
			loading: 'Įkeliama...',
			rejectAll: 'Atmesti visus',
			saveSettings: 'Išsaugoti nustatymus',
			showingSelectedVendor: 'Rodomas pasirinktas tiekėjas',
		},
		preferenceCenter: {
			description:
				'Čia galite tinkinti savo privatumo nustatymus. Galite pasirinkti, kokių tipų slapukus ir sekimo technologijas leidžiate naudoti.',
			footer: {
				consentStorage:
					'Sutikimo nuostatos saugomos slapuke pavadinimu „euconsent-v2“ 13 mėnesių. Kai atnaujinate savo nuostatas, saugojimo trukmė gali būti pradėta skaičiuoti iš naujo.',
			},
			purposeItem: {
				examples: 'Pavyzdžiai',
				legitimateInterest: 'Teisėtas interesas',
				objectButton: 'Nesutikti',
				objected: 'Prieštarauta',
				partners: '{count} partneriai',
				partnersUsingPurpose: 'Partneriai, naudojantys šį tikslą',
				rightToObject:
					'Jūs turite teisę nesutikti su tvarkymu, pagrįstu teisėtu interesu.',
				vendorsUseLegitimateInterest:
					'{count} tiekėjai teigia turintys teisėtą interesą',
				withYourPermission: 'Su jūsų leidimu',
			},
			specialPurposes: {
				title: 'Esminės funkcijos (privaloma)',
				tooltip:
					'Jos reikalingos svetainės funkcionalumui ir saugumui užtikrinti. Pagal IAB TCF negalite nesutikti su šiais specialiais tikslais.',
			},
			tabs: {
				purposes: 'Tikslai',
				vendors: 'Tiekėjai',
			},
			title: 'Privatumo nustatymai',
			vendorList: {
				customVendorsHeading: 'Pasirinktiniai partneriai',
				customVendorsNotice:
					'Tai yra pasirinktiniai partneriai, kurie nėra užregistruoti IAB Transparency & Consent Framework (TCF). Jie tvarko duomenis remdamiesi jūsų sutikimu ir gali taikyti kitokią privatumo praktiką nei IAB registruoti tiekėjai.',
				dataCategories: 'Duomenų kategorijos',
				features: 'Funkcijos',
				iabVendorsHeading: 'IAB registruoti tiekėjai',
				iabVendorsNotice:
					'Šie partneriai yra užregistruoti IAB Transparency & Consent Framework (TCF) – pramonės standarte, skirtame sutikimų valdymui',
				legitimateInterest: 'Teisėtas int.',
				maxAge: 'Maks. amžius: {days}d',
				nonCookieAccess: 'Prieiga be slapukų',
				privacyPolicy: 'Privatumo politika',
				purposes: 'Tikslai',
				requiredNotice:
					'Reikalinga svetainės funkcionalumui, negalima išjungti',
				retention: 'Saugojimas: {days}d',
				search: 'Ieškoti tiekėjų...',
				showingCount: 'Rodoma {filtered} iš {total} tiekėjų',
				specialFeatures: 'Specialios funkcijos',
				specialPurposes: 'Specialūs tikslai',
				storageDisclosure: 'Informacija apie saugojimą',
				usesCookies: 'Naudoja slapukus',
			},
		},
	},
	legalLinks: {
		cookiePolicy: 'Slapukų politika',
		privacyPolicy: 'Privatumo politika',
		termsOfService: 'Naudojimosi sąlygos',
	},
};
export default translations;
