import type { CompleteTranslations } from '../types';
export const translations: CompleteTranslations = {
	common: {
		acceptAll: 'Nõustu kõigiga',
		rejectAll: 'Keeldu kõigist',
		customize: 'Kohanda',
		save: 'Salvesta seaded',
	},
	cookieBanner: {
		title: 'Hindame teie privaatsust',
		description:
			'See sait kasutab küpsiseid, et parandada teie sirvimiskogemust, analüüsida saidi liiklust ja näidata isikupärastatud sisu.',
	},
	consentManagerDialog: {
		title: 'Privaatsusseaded',
		description:
			'Kohandage siin oma privaatsusseadeid. Saate valida, milliseid küpsiseid ja jälgimistehnoloogiaid lubate.',
	},
	consentTypes: {
		necessary: {
			title: 'Hädavajalikud',
			description:
				'Need küpsised on veebisaidi nõuetekohaseks toimimiseks hädavajalikud ja neid ei saa keelata.',
		},
		functionality: {
			title: 'Funktsionaalsus',
			description:
				'Need küpsised võimaldavad veebisaidi täiustatud funktsionaalsust ja isikupärastamist.',
		},
		marketing: {
			title: 'Turundus',
			description:
				'Neid küpsiseid kasutatakse asjakohaste reklaamide edastamiseks ja nende tõhususe jälgimiseks.',
		},
		measurement: {
			title: 'Analüütika',
			description:
				'Need küpsised aitavad meil mõista, kuidas külastajad veebisaidiga suhtlevad, ja parandada selle toimivust.',
		},
		experience: {
			title: 'Kogemus',
			description:
				'Need küpsised aitavad meil pakkuda paremat kasutajakogemust ja testida uusi funktsioone.',
		},
	},
	frame: {
		title: 'Selle sisu vaatamiseks nõustuge kategooria {category} nõusolekuga.',
		actionButton: 'Luba kategooria {category} nõusolek',
	},
	legalLinks: {
		privacyPolicy: 'Privaatsuspoliitika',
		cookiePolicy: 'Küpsiste poliitika',
		termsOfService: 'Kasutustingimused',
	},
	iab: {
		banner: {
			title: 'Privaatsusseaded',
			description:
				'Meie ja meie {partnerCount} partnerit salvestavad ja/või pääsevad ligi teie seadmes olevatele andmetele ning töötlevad isikuandmeid, nagu unikaalsed identifikaatorid ja sirvimisandmed sellel veebilehel, et:',
			partnersLink: '{count} partnerit',
			andMore: 'Ja veel {count}...',
			legitimateInterestNotice:
				'Mõned partnerid väidavad, et neil on õigustatud huvi teie andmete töötlemiseks. Teil on õigus sellele töötlemisele vastu vaielda, oma valikuid kohandada ja nõusolek igal ajal tagasi võtta.',
		},
		preferenceCenter: {
			title: 'Privaatsusseaded',
			description:
				'Kohandage siin oma privaatsusseadeid. Saate valida, milliseid küpsiseid ja jälgimistehnoloogiaid lubate.',
			tabs: {
				purposes: 'Eesmärgid',
				vendors: 'Teenusepakkujad',
			},
			purposeItem: {
				partners: '{count} partnerit',
				vendorsUseLegitimateInterest:
					'{count} teenusepakkujat väidavad õigustatud huvi',
				examples: 'Näited',
				partnersUsingPurpose: 'Selle eesmärgi kasutavad partnerid',
				withYourPermission: 'Teie loal',
				legitimateInterest: 'Õigustatud huvi',
				objectButton: 'Vaidle vastu',
				objected: 'Vastu vaieldud',
				rightToObject:
					'Teil on õigus vaielda vastu töötlemisele, mis põhineb õigustatud huvil.',
			},
			specialPurposes: {
				title: 'Olulised funktsioonid (nõutud)',
				tooltip:
					'Need on vajalikud saidi toimimiseks ja turvalisuseks. IAB TCF-i kohaselt ei saa nendele erieesmärkidele vastu vaielda.',
			},
			vendorList: {
				search: 'Otsi teenusepakkujaid...',
				showingCount: 'Kuvatakse {filtered} / {total} teenusepakkujat',
				iabVendorsHeading: 'IAB registreeritud teenusepakkujad',
				iabVendorsNotice:
					'Need partnerid on registreeritud IAB läbipaistvuse ja nõusoleku raamistikus (TCF), mis on tööstusstandard nõusoleku haldamiseks',
				customVendorsHeading: 'Kohandatud partnerid',
				customVendorsNotice:
					'Need on kohandatud partnerid, kes ei ole registreeritud IAB läbipaistvuse ja nõusoleku raamistikus (TCF). Nad töötlevad andmeid teie nõusoleku alusel ning nende privaatsustavad võivad erineda IAB-sertifitseeritud partnerite omadest.',
				purposes: 'Eesmärgid',
				specialPurposes: 'Eriotstarbed',
				specialFeatures: 'Eriomadused',
				dataCategories: 'Andmekategooriad',
				usesCookies: 'Kasutab küpsiseid',
				nonCookieAccess: 'Küpsisteta juurdepääs',
				maxAge: 'Maksimaalne vanus: {days}p',
				legitimateInterest: 'Õigustatud huvi',
				privacyPolicy: 'Privaatsuspoliitika',
				storageDisclosure: 'Salvestamise teave',
				requiredNotice: 'Vajalik saidi toimimiseks, ei saa keelata',
			},
			footer: {
				consentStorage:
					'Nõusoleku eelistused salvestatakse küpsisesse nimega "euconsent-v2" 13 kuuks.',
			},
		},
		common: {
			acceptAll: 'Nõustu kõigiga',
			rejectAll: 'Keeldu kõigist',
			customize: 'Kohanda',
			saveSettings: 'Salvesta seaded',
			loading: 'Laadimine...',
			showingSelectedVendor: 'Kuvatakse valitud partner',
			clearSelection: 'Tühjenda',
			customPartner: 'Kohandatud partner, kes ei ole IAB-s registreeritud',
		},
	},
};
export default translations;
