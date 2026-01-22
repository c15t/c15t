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
	iab: {
		banner: {
			title: 'Adatvédelmi beállítások',
			description:
				'Mi és a(z) {partnerCount} partnerünk információkat tárolunk az Ön eszközén és/vagy érünk el azokhoz, valamint személyes adatokat, például egyedi azonosítókat és böngészési adatokat dolgozunk fel ezen a weboldalon a következő célokból:',
			partnersLink: '{count} partner',
			andMore: 'És még {count}...',
			legitimateInterestNotice:
				'Néhány partner jogos érdekre hivatkozik az Ön adatainak feldolgozásához. Önnek joga van tiltakozni ez ellen a feldolgozás ellen, testreszabni választásait, és bármikor visszavonni hozzájárulását.',
		},
		preferenceCenter: {
			title: 'Adatvédelmi beállítások',
			description:
				'Testreszabhatja adatvédelmi beállításait itt. Kiválaszthatja, hogy milyen típusú sütiket és nyomkövető technológiákat engedélyez.',
			tabs: {
				purposes: 'Célok',
				vendors: 'Szolgáltatók',
			},
			purposeItem: {
				partners: '{count} partner',
				vendorsUseLegitimateInterest:
					'{count} szolgáltató jogos érdekre hivatkozik',
				examples: 'Példák',
				partnersUsingPurpose: 'Ezt a célt használó partnerek',
				withYourPermission: 'Az Ön engedélyével',
				legitimateInterest: 'Jogos érdek',
				objectButton: 'Tiltakozás',
				objected: 'Tiltakozott',
				rightToObject:
					'Önnek joga van tiltakozni a jogos érdeken alapuló adatkezelés ellen.',
			},
			specialPurposes: {
				title: 'Alapvető funkciók (szükséges)',
				tooltip:
					'Ezek a webhely működéséhez és biztonságához szükségesek. Az IAB TCF szerint Ön nem tiltakozhat ezen különleges célok ellen.',
			},
			vendorList: {
				search: 'Szolgáltatók keresése...',
				showingCount: '{total} szolgáltatóból {filtered} megjelenítése',
				iabVendorsHeading: 'IAB regisztrált szolgáltatók',
				iabVendorsNotice:
					'Ezek a partnerek regisztrálva vannak az IAB Transparency & Consent Framework (TCF) rendszerében, amely a hozzájárulások kezelésének iparági szabványa',
				customVendorsHeading: 'Egyedi partnerek',
				customVendorsNotice:
					'Ezek olyan egyedi partnerek, akik nincsenek regisztrálva az IAB Transparency & Consent Framework (TCF) rendszerében. Az Ön hozzájárulása alapján kezelik az adatokat, és az IAB-regisztrált szolgáltatóktól eltérő adatvédelmi gyakorlatot folytathatnak.',
				purposes: 'Célok',
				specialPurposes: 'Különleges célok',
				specialFeatures: 'Különleges funkciók',
				dataCategories: 'Adatkategóriák',
				usesCookies: 'Sütiket használ',
				nonCookieAccess: 'Nem süti alapú hozzáférés',
				maxAge: 'Max. élettartam: {days} nap',
				legitimateInterest: 'Jogos érdek',
				privacyPolicy: 'Adatvédelmi szabályzat',
				storageDisclosure: 'Tárolási tájékoztató',
				requiredNotice: 'A webhely működéséhez szükséges, nem kapcsolható ki',
			},
			footer: {
				consentStorage:
					'A hozzájárulási beállításokat egy "euconsent-v2" nevű sütiben tároljuk 13 hónapig.',
			},
		},
		common: {
			acceptAll: 'Összes elfogadása',
			rejectAll: 'Összes elutasítása',
			customize: 'Testreszabás',
			saveSettings: 'Beállítások mentése',
			loading: 'Betöltés...',
			showingSelectedVendor: 'A kiválasztott szolgáltató megjelenítése',
			clearSelection: 'Törlés',
			customPartner: 'IAB-n kívüli egyedi partner',
		},
	},
};
export default translations;
