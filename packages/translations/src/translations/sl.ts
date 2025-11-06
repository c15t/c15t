import type { CompleteTranslations } from '../types';
export const translations: CompleteTranslations = {
	common: {
		acceptAll: 'Sprejmi vse',
		rejectAll: 'Zavrni vse',
		customize: 'Prilagodi',
		save: 'Shrani nastavitve',
	},
	cookieBanner: {
		title: 'Cenimo vašo zasebnost',
		description:
			'Ta spletna stran uporablja piškotke za izboljšanje vaše uporabniške izkušnje, analizo prometa na strani in prikaz personaliziranih vsebin.',
	},
	consentManagerDialog: {
		title: 'Nastavitve zasebnosti',
		description:
			'Tukaj prilagodite svoje nastavitve zasebnosti. Izberete lahko, katere vrste piškotkov in tehnologij sledenja dovolite.',
	},
	consentTypes: {
		necessary: {
			title: 'Nujno potrebni',
			description:
				'Ti piškotki so bistveni za pravilno delovanje spletne strani in jih ni mogoče onemogočiti.',
		},
		functionality: {
			title: 'Funkcionalnost',
			description:
				'Ti piškotki omogočajo izboljšano funkcionalnost in personalizacijo spletne strani.',
		},
		marketing: {
			title: 'Trženje',
			description:
				'Ti piškotki se uporabljajo za prikazovanje relevantnih oglasov in spremljanje njihove učinkovitosti.',
		},
		measurement: {
			title: 'Analitika',
			description:
				'Ti piškotki nam pomagajo razumeti, kako obiskovalci uporabljajo spletno stran, in izboljšati njeno delovanje.',
		},
		experience: {
			title: 'Izkušnja',
			description:
				'Ti piškotki nam pomagajo zagotoviti boljšo uporabniško izkušnjo in testirati nove funkcije.',
		},
	},
	frame: {
		title: 'Za ogled te vsebine sprejmite soglasje za kategorijo {category}.',
		actionButton: 'Omogoči soglasje za {category}',
	},
	legalLinks: {
		privacyPolicy: 'Pravilnik o zasebnosti',
		cookiePolicy: 'Pravilnik o piškotkih',
		termsOfService: 'Pogoji uporabe',
	},
};
export default translations;
