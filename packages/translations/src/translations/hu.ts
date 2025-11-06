import type { CompleteTranslations } from '../types';
export const translations: CompleteTranslations = {
	common: {
		acceptAll: 'Összes elfogadása',
		rejectAll: 'Összes elutasítása',
		customize: 'Testreszabás',
		save: 'Beállítások mentése',
	},
	cookieBanner: {
		title: 'Értékeljük az adatvédelmet',
		description:
			'Ez a webhely sütiket használ a böngészési élmény javítására, a forgalom elemzésére és személyre szabott tartalom megjelenítésére.',
	},
	consentManagerDialog: {
		title: 'Adatvédelmi beállítások',
		description:
			'Testreszabhatja adatvédelmi beállításait itt. Kiválaszthatja, hogy milyen típusú sütiket és nyomkövető technológiákat engedélyez.',
	},
	consentTypes: {
		necessary: {
			title: 'Feltétlenül szükséges',
			description:
				'Ezek a sütik elengedhetetlenek a weboldal megfelelő működéséhez, és nem kapcsolhatók ki.',
		},
		functionality: {
			title: 'Funkcionalitás',
			description:
				'Ezek a sütik lehetővé teszik a weboldal továbbfejlesztett funkcióit és személyre szabását.',
		},
		marketing: {
			title: 'Marketing',
			description:
				'Ezeket a sütiket releváns hirdetések megjelenítésére és hatékonyságuk nyomon követésére használjuk.',
		},
		measurement: {
			title: 'Analitika',
			description:
				'Ezek a sütik segítenek megérteni, hogyan lépnek kapcsolatba a látogatók a weboldallal, és javítják annak teljesítményét.',
		},
		experience: {
			title: 'Felhasználói élmény',
			description:
				'Ezek a sütik segítenek jobb felhasználói élményt nyújtani és új funkciókat tesztelni.',
		},
	},
	frame: {
		title:
			'Fogadja el a(z) {category} hozzájárulást a tartalom megtekintéséhez.',
		actionButton: 'A(z) {category} hozzájárulás engedélyezése',
	},
	legalLinks: {
		privacyPolicy: 'Adatvédelmi szabályzat',
		cookiePolicy: 'Süti szabályzat',
		termsOfService: 'Felhasználási feltételek',
	},
};
export default translations;
