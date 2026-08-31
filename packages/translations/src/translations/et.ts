import type { CompleteTranslations } from '../types';

export const translations: CompleteTranslations = {
	common: {
		acceptAll: 'Nõustu kõigiga',
		close: 'Sulge',
		customize: 'Kohanda',
		rejectAll: 'Keeldu kõigist',
		save: 'Salvesta seaded',
		securedBy: 'Kaitse pakub',
	},
	consentManagerDialog: {
		description:
			'Kohandage siin oma privaatsusseadeid. Saate valida, milliseid küpsiseid ja jälgimistehnoloogiaid lubate.',
		title: 'Privaatsusseaded',
	},
	consentTypes: {
		experience: {
			description:
				'Need küpsised aitavad meil pakkuda paremat kasutajakogemust ja testida uusi funktsioone.',
			title: 'Kogemus',
		},
		functionality: {
			description:
				'Need küpsised võimaldavad veebisaidi täiustatud funktsionaalsust ja isikupärastamist.',
			title: 'Funktsionaalsus',
		},
		marketing: {
			description:
				'Neid küpsiseid kasutatakse asjakohaste reklaamide edastamiseks ja nende tõhususe jälgimiseks.',
			title: 'Turundus',
		},
		measurement: {
			description:
				'Need küpsised aitavad meil mõista, kuidas külastajad veebisaidiga suhtlevad, ja parandada selle toimivust.',
			title: 'Analüütika',
		},
		necessary: {
			description:
				'Need küpsised on veebisaidi nõuetekohaseks toimimiseks hädavajalikud ja neid ei saa keelata.',
			title: 'Hädavajalikud',
		},
	},
	cookieBanner: {
		description:
			'See sait kasutab küpsiseid, et parandada teie sirvimiskogemust, analüüsida saidi liiklust ja näidata isikupärastatud sisu.',
		title: 'Hindame teie privaatsust',
	},
	frame: {
		actionButton: 'Luba kategooria {category} nõusolek',
		error: 'This content could not be loaded.',
		loading: 'Loading content…',
		policyBlocked:
			"This content is unavailable under your region's consent policy.",
		title: 'Selle sisu vaatamiseks nõustuge kategooria {category} nõusolekuga.',
	},
	iab: {
		banner: {
			andMore: 'Ja veel {count}...',
			description:
				'Meie ja meie {partnerCount} partnerit salvestavad ja/või pääsevad ligi teie seadmes olevatele andmetele ning töötlevad isikuandmeid, nagu unikaalsed identifikaatorid ja sirvimisandmed sellel veebilehel, et:',
			legitimateInterestNotice:
				'Mõned partnerid väidavad, et neil on õigustatud huvi teie andmete töötlemiseks. Teil on õigus sellele töötlemisele vastu vaielda, oma valikuid kohandada ja nõusolek igal ajal tagasi võtta.',
			partnersLink: '{count} partnerit',
			scopeGroup: 'Teie valik kehtib kõigil meie veebisaitidel selles grupis.',
			scopeServiceSpecific:
				'Sinu nõusolek kehtib ainult sellele veebisaidile ega mõjuta teisi teenuseid.',
			title: 'Privaatsusseaded',
		},
		common: {
			acceptAll: 'Nõustu kõigiga',
			clearSelection: 'Tühjenda',
			customPartner: 'Kohandatud partner, kes ei ole IAB-s registreeritud',
			customize: 'Kohanda',
			loading: 'Laadimine...',
			rejectAll: 'Keeldu kõigist',
			saveSettings: 'Salvesta seaded',
			showingSelectedVendor: 'Kuvatakse valitud partner',
		},
		preferenceCenter: {
			description:
				'Kohandage siin oma privaatsusseadeid. Saate valida, milliseid küpsiseid ja jälgimistehnoloogiaid lubate.',
			footer: {
				consentStorage:
					'Nõusoleku eelistused salvestatakse küpsisesse nimega "euconsent-v2" 13 kuuks. Salvestusaeg võib teie eelistuste uuendamisel uuesti alata.',
			},
			purposeItem: {
				examples: 'Näited',
				legitimateInterest: 'Õigustatud huvi',
				objectButton: 'Vaidle vastu',
				objected: 'Vastu vaieldud',
				partners: '{count} partnerit',
				partnersUsingPurpose: 'Selle eesmärgi kasutavad partnerid',
				rightToObject:
					'Teil on õigus vaielda vastu töötlemisele, mis põhineb õigustatud huvil.',
				vendorsUseLegitimateInterest:
					'{count} teenusepakkujat väidavad õigustatud huvi',
				withYourPermission: 'Teie loal',
			},
			specialPurposes: {
				title: 'Olulised funktsioonid (nõutud)',
				tooltip:
					'Need on vajalikud saidi toimimiseks ja turvalisuseks. IAB TCF-i kohaselt ei saa nendele erieesmärkidele vastu vaielda.',
			},
			tabs: {
				purposes: 'Eesmärgid',
				vendors: 'Teenusepakkujad',
			},
			title: 'Privaatsusseaded',
			vendorList: {
				customVendorsHeading: 'Kohandatud partnerid',
				customVendorsNotice:
					'Need on kohandatud partnerid, kes ei ole registreeritud IAB läbipaistvuse ja nõusoleku raamistikus (TCF). Nad töötlevad andmeid teie nõusoleku alusel ning nende privaatsustavad võivad erineda IAB-sertifitseeritud partnerite omadest.',
				dataCategories: 'Andmekategooriad',
				features: 'Omadused',
				iabVendorsHeading: 'IAB registreeritud teenusepakkujad',
				iabVendorsNotice:
					'Need partnerid on registreeritud IAB läbipaistvuse ja nõusoleku raamistikus (TCF), mis on tööstusstandard nõusoleku haldamiseks',
				legitimateInterest: 'Õigustatud huvi',
				maxAge: 'Maksimaalne vanus: {days}p',
				nonCookieAccess: 'Küpsisteta juurdepääs',
				privacyPolicy: 'Privaatsuspoliitika',
				purposes: 'Eesmärgid',
				requiredNotice: 'Vajalik saidi toimimiseks, ei saa keelata',
				retention: 'Säilitamine: {days}p',
				search: 'Otsi teenusepakkujaid...',
				showingCount: 'Kuvatakse {filtered} / {total} teenusepakkujat',
				specialFeatures: 'Eriomadused',
				specialPurposes: 'Eriotstarbed',
				storageDisclosure: 'Salvestamise teave',
				usesCookies: 'Kasutab küpsiseid',
			},
		},
	},
	legalLinks: {
		cookiePolicy: 'Küpsiste poliitika',
		privacyPolicy: 'Privaatsuspoliitika',
		termsOfService: 'Kasutustingimused',
	},
};
export default translations;
