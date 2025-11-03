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
};
export default translations;
