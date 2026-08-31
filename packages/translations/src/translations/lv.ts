import type { CompleteTranslations } from '../types';

export const translations: CompleteTranslations = {
	common: {
		acceptAll: 'Pieņemt visu',
		close: 'Aizvērt',
		customize: 'Pielāgot',
		rejectAll: 'Noraidīt visu',
		save: 'Saglabāt iestatījumus',
		securedBy: 'Aizsardzību nodrošina',
	},
	consentManagerDialog: {
		description:
			'Pielāgojiet savus privātuma iestatījumus šeit. Jūs varat izvēlēties, kāda veida sīkdatnes un izsekošanas tehnoloģijas atļaut.',
		title: 'Privātuma iestatījumi',
	},
	consentTypes: {
		experience: {
			description:
				'Šīs sīkdatnes palīdz mums nodrošināt labāku lietotāja pieredzi un testēt jaunas funkcijas.',
			title: 'Pieredze',
		},
		functionality: {
			description:
				'Šīs sīkdatnes nodrošina uzlabotu funkcionalitāti un vietnes personalizāciju.',
			title: 'Funkcionalitāte',
		},
		marketing: {
			description:
				'Šīs sīkdatnes tiek izmantotas, lai piegādātu atbilstošas reklāmas un izsekotu to efektivitāti.',
			title: 'Mārketings',
		},
		measurement: {
			description:
				'Šīs sīkdatnes palīdz mums saprast, kā apmeklētāji mijiedarbojas ar vietni un uzlabo tās veiktspēju.',
			title: 'Analītika',
		},
		necessary: {
			description:
				'Šīs sīkdatnes ir būtiskas, lai vietne darbotos pareizi, un tās nevar atspējot.',
			title: 'Stingri nepieciešamās',
		},
	},
	cookieBanner: {
		description:
			'Šī vietne izmanto sīkdatnes, lai uzlabotu jūsu pārlūkošanas pieredzi, analizētu vietnes datplūsmu un rādītu personalizētu saturu.',
		title: 'Mēs novērtējam jūsu privātumu',
	},
	frame: {
		actionButton: 'Iespējot {category} piekrišanu',
		error: 'This content could not be loaded.',
		loading: 'Loading content…',
		policyBlocked:
			"This content is unavailable under your region's consent policy.",
		title: 'Pieņemiet {category} piekrišanu, lai skatītu šo saturu.',
	},
	iab: {
		banner: {
			andMore: 'Un vēl {count}...',
			description:
				'Mēs un mūsu {partnerCount} partneri uzglabājam un/vai piekļūstam informācijai jūsu ierīcē un apstrādājam personas datus, piemēram, unikālus identifikatorus un pārlūkošanas datus, šai vietnei, lai:',
			legitimateInterestNotice:
				'Daži partneri pieprasa leģitīmas intereses jūsu datu apstrādei. Jums ir tiesības iebilst pret šo apstrādi, pielāgot savu izvēli un jebkurā laikā atsaukt savu piekrišanu.',
			partnersLink: '{count} partneri',
			scopeGroup: 'Jūsu izvēle attiecas uz visām mūsu vietnēm šajā grupā.',
			scopeServiceSpecific:
				'Jūsu piekrišana attiecas tikai uz šo vietni un neietekmēs citus pakalpojumus.',
			title: 'Privātuma iestatījumi',
		},
		common: {
			acceptAll: 'Pieņemt visu',
			clearSelection: 'Notīrīt',
			customPartner: 'Pielāgots partneris, kas nav reģistrēts IAB',
			customize: 'Pielāgot',
			loading: 'Ielādē...',
			rejectAll: 'Noraidīt visu',
			saveSettings: 'Saglabāt iestatījumus',
			showingSelectedVendor: 'Rāda atlasīto piegādātāju',
		},
		preferenceCenter: {
			description:
				'Pielāgojiet savus privātuma iestatījumus šeit. Jūs varat izvēlēties, kāda veida sīkdatnes un izsekošanas tehnoloģijas atļaut.',
			footer: {
				consentStorage:
					'Piekrišanas iestatījumi tiek glabāti sīkdatnē ar nosaukumu "euconsent-v2" 13 mēnešus. Glabāšanas ilgums var tikt atjaunots, kad jūs atjaunināt savus iestatījumus.',
			},
			purposeItem: {
				examples: 'Piemēri',
				legitimateInterest: 'Leģitīmās intereses',
				objectButton: 'Iebilst',
				objected: 'Iebilsts',
				partners: '{count} partneri',
				partnersUsingPurpose: 'Partneri, kas izmanto šo mērķi',
				rightToObject:
					'Jums ir tiesības iebilst pret apstrādi, kuras pamatā ir leģitīmas intereses.',
				vendorsUseLegitimateInterest:
					'{count} piegādātāji pieprasa leģitīmas intereses',
				withYourPermission: 'Ar jūsu atļauju',
			},
			specialPurposes: {
				title: 'Būtiskas funkcijas (nepieciešams)',
				tooltip:
					'Tās ir nepieciešamas vietnes funkcionalitātei un drošībai. Saskaņā ar IAB TCF jūs nevarat iebilst pret šiem īpašajiem mērķiem.',
			},
			tabs: {
				purposes: 'Mērķi',
				vendors: 'Piegādātāji',
			},
			title: 'Privātuma iestatījumi',
			vendorList: {
				customVendorsHeading: 'Pielāgoti partneri',
				customVendorsNotice:
					'Šie ir pielāgoti partneri, kas nav reģistrēti IAB Transparency & Consent Framework (TCF). Viņi apstrādā datus, pamatojoties uz jūsu piekrišanu, un viņiem var būt atšķirīga privātuma prakse nekā IAB reģistrētajiem piegādātājiem.',
				dataCategories: 'Datu kategorijas',
				features: 'Funkcijas',
				iabVendorsHeading: 'IAB reģistrētie piegādātāji',
				iabVendorsNotice:
					'Šie partneri ir reģistrēti IAB Transparency & Consent Framework (TCF) — nozares standartā piekrišanas pārvaldībai',
				legitimateInterest: 'Leģ. intereses',
				maxAge: 'Maks. vecums: {days}d',
				nonCookieAccess: 'Piekļuve bez sīkdatnēm',
				privacyPolicy: 'Privātuma politika',
				purposes: 'Mērķi',
				requiredNotice: 'Nepieciešams vietnes funkcionalitātei, nevar atspējot',
				retention: 'Saglabāšana: {days}d',
				search: 'Meklēt piegādātājus...',
				showingCount: 'Rāda {filtered} no {total} piegādātājiem',
				specialFeatures: 'Īpašās funkcijas',
				specialPurposes: 'Īpašie mērķi',
				storageDisclosure: 'Informācija par glabāšanu',
				usesCookies: 'Izmanto sīkdatnes',
			},
		},
	},
	legalLinks: {
		cookiePolicy: 'Sīkdatņu politika',
		privacyPolicy: 'Privātuma politika',
		termsOfService: 'Pakalpojumu sniegšanas noteikumi',
	},
};
export default translations;
