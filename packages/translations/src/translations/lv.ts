import type { CompleteTranslations } from '../types';
export const translations: CompleteTranslations = {
	common: {
		acceptAll: 'Pieņemt visu',
		rejectAll: 'Noraidīt visu',
		customize: 'Pielāgot',
		save: 'Saglabāt iestatījumus',
	},
	cookieBanner: {
		title: 'Mēs novērtējam jūsu privātumu',
		description:
			'Šī vietne izmanto sīkdatnes, lai uzlabotu jūsu pārlūkošanas pieredzi, analizētu vietnes datplūsmu un rādītu personalizētu saturu.',
	},
	consentManagerDialog: {
		title: 'Privātuma iestatījumi',
		description:
			'Pielāgojiet savus privātuma iestatījumus šeit. Jūs varat izvēlēties, kāda veida sīkdatnes un izsekošanas tehnoloģijas atļaut.',
	},
	consentTypes: {
		necessary: {
			title: 'Stingri nepieciešamās',
			description:
				'Šīs sīkdatnes ir būtiskas, lai vietne darbotos pareizi, un tās nevar atspējot.',
		},
		functionality: {
			title: 'Funkcionalitāte',
			description:
				'Šīs sīkdatnes nodrošina uzlabotu funkcionalitāti un vietnes personalizāciju.',
		},
		marketing: {
			title: 'Mārketings',
			description:
				'Šīs sīkdatnes tiek izmantotas, lai piegādātu atbilstošas reklāmas un izsekotu to efektivitāti.',
		},
		measurement: {
			title: 'Analītika',
			description:
				'Šīs sīkdatnes palīdz mums saprast, kā apmeklētāji mijiedarbojas ar vietni un uzlabo tās veiktspēju.',
		},
		experience: {
			title: 'Pieredze',
			description:
				'Šīs sīkdatnes palīdz mums nodrošināt labāku lietotāja pieredzi un testēt jaunas funkcijas.',
		},
	},
	frame: {
		title: 'Pieņemiet {category} piekrišanu, lai skatītu šo saturu.',
		actionButton: 'Iespējot {category} piekrišanu',
	},
	legalLinks: {
		privacyPolicy: 'Privātuma politika',
		cookiePolicy: 'Sīkdatņu politika',
		termsOfService: 'Pakalpojumu sniegšanas noteikumi',
	},
	iab: {
		banner: {
			title: 'Privātuma iestatījumi',
			description:
				'Mēs un mūsu {partnerCount} partneri uzglabājam un/vai piekļūstam informācijai jūsu ierīcē un apstrādājam personas datus, piemēram, unikālus identifikatorus un pārlūkošanas datus, šai vietnei, lai:',
			partnersLink: '{count} partneri',
			andMore: 'Un vēl {count}...',
			legitimateInterestNotice:
				'Daži partneri pieprasa leģitīmas intereses jūsu datu apstrādei. Jums ir tiesības iebilst pret šo apstrādi, pielāgot savu izvēli un jebkurā laikā atsaukt savu piekrišanu.',
		},
		preferenceCenter: {
			title: 'Privātuma iestatījumi',
			description:
				'Pielāgojiet savus privātuma iestatījumus šeit. Jūs varat izvēlēties, kāda veida sīkdatnes un izsekošanas tehnoloģijas atļaut.',
			tabs: {
				purposes: 'Mērķi',
				vendors: 'Piegādātāji',
			},
			purposeItem: {
				partners: '{count} partneri',
				vendorsUseLegitimateInterest:
					'{count} piegādātāji pieprasa leģitīmas intereses',
				examples: 'Piemēri',
				partnersUsingPurpose: 'Partneri, kas izmanto šo mērķi',
				withYourPermission: 'Ar jūsu atļauju',
				legitimateInterest: 'Leģitīmās intereses',
				objectButton: 'Iebilst',
				objected: 'Iebilsts',
				rightToObject:
					'Jums ir tiesības iebilst pret apstrādi, kuras pamatā ir leģitīmas intereses.',
			},
			specialPurposes: {
				title: 'Būtiskas funkcijas (nepieciešams)',
				tooltip:
					'Tās ir nepieciešamas vietnes funkcionalitātei un drošībai. Saskaņā ar IAB TCF jūs nevarat iebilst pret šiem īpašajiem mērķiem.',
			},
			vendorList: {
				search: 'Meklēt piegādātājus...',
				showingCount: 'Rāda {filtered} no {total} piegādātājiem',
				iabVendorsHeading: 'IAB reģistrētie piegādātāji',
				iabVendorsNotice:
					'Šie partneri ir reģistrēti IAB Transparency & Consent Framework (TCF) — nozares standartā piekrišanas pārvaldībai',
				customVendorsHeading: 'Pielāgoti partneri',
				customVendorsNotice:
					'Šie ir pielāgoti partneri, kas nav reģistrēti IAB Transparency & Consent Framework (TCF). Viņi apstrādā datus, pamatojoties auf jūsu piekrišanu, un viņiem var būt atšķirīga privātuma prakse nekā IAB reģistrētajiem piegādātājiem.',
				purposes: 'Mērķi',
				specialPurposes: 'Īpašie mērķi',
				specialFeatures: 'Īpašās funkcijas',
				dataCategories: 'Datu kategorijas',
				usesCookies: 'Izmanto sīkdatnes',
				nonCookieAccess: 'Piekļuve bez sīkdatnēm',
				maxAge: 'Maks. vecums: {days}d',
				legitimateInterest: 'Leģ. intereses',
				privacyPolicy: 'Privātuma politika',
				storageDisclosure: 'Informācija par glabāšanu',
				requiredNotice: 'Nepieciešams vietnes funkcionalitātei, nevar atspējot',
			},
			footer: {
				consentStorage:
					'Piekrišanas preferences tiek glabātas sīkdatnē ar nosaukumu "euconsent-v2" 13 mēnešus.',
			},
		},
		common: {
			acceptAll: 'Pieņemt visu',
			rejectAll: 'Noraidīt visu',
			customize: 'Pielāgot',
			saveSettings: 'Saglabāt iestatījumus',
			loading: 'Ielādē...',
			showingSelectedVendor: 'Rāda atlasīto piegādātāju',
			clearSelection: 'Notīrīt',
			customPartner: 'Pielāgots partneris, kas nav reģistrēts IAB',
		},
	},
};
export default translations;
