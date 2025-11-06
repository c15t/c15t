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
};
export default translations;
