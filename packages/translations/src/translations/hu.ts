import type { CompleteTranslations } from '../types';

export const translations: CompleteTranslations = {
	common: {
		acceptAll: 'Összes elfogadása',
		close: 'Bezárás',
		customize: 'Testreszabás',
		rejectAll: 'Összes elutasítása',
		save: 'Beállítások mentése',
		securedBy: 'Védelmét biztosítja',
	},
	consentManagerDialog: {
		description:
			'Testreszabhatja adatvédelmi beállításait itt. Kiválaszthatja, hogy milyen típusú sütiket és nyomkövető technológiákat engedélyez.',
		title: 'Adatvédelmi beállítások',
	},
	consentTypes: {
		experience: {
			description:
				'Ezek a sütik segítenek jobb felhasználói élményt nyújtani és új funkciókat tesztelni.',
			title: 'Felhasználói élmény',
		},
		functionality: {
			description:
				'Ezek a sütik lehetővé teszik a weboldal továbbfejlesztett funkcióit és személyre szabását.',
			title: 'Funkcionalitás',
		},
		marketing: {
			description:
				'Ezeket a sütiket releváns hirdetések megjelenítésére és hatékonyságuk nyomon követésére használjuk.',
			title: 'Marketing',
		},
		measurement: {
			description:
				'Ezek a sütik segítenek megérteni, hogyan lépnek kapcsolatba a látogatók a weboldallal, és javítják annak teljesítményét.',
			title: 'Analitika',
		},
		necessary: {
			description:
				'Ezek a sütik elengedhetetlenek a weboldal megfelelő működéséhez, és nem kapcsolhatók ki.',
			title: 'Feltétlenül szükséges',
		},
	},
	cookieBanner: {
		description:
			'Ez a webhely sütiket használ a böngészési élmény javítására, a forgalom elemzésére és személyre szabott tartalom megjelenítésére.',
		title: 'Értékeljük az adatvédelmet',
	},
	frame: {
		actionButton: 'A(z) {category} hozzájárulás engedélyezése',
		error: 'This content could not be loaded.',
		loading: 'Loading content…',
		policyBlocked:
			"This content is unavailable under your region's consent policy.",
		title:
			'Fogadja el a(z) {category} hozzájárulást a tartalom megtekintéséhez.',
	},
	iab: {
		banner: {
			andMore: 'És még {count}...',
			description:
				'Mi és a(z) {partnerCount} partnerünk információkat tárolunk az Ön eszközén és/vagy érünk el azokhoz, valamint személyes adatokat, például egyedi azonosítókat és böngészési adatokat dolgozunk fel ezen a weboldalon a következő célokból:',
			legitimateInterestNotice:
				'Néhány partner jogos érdekre hivatkozik az Ön adatainak feldolgozásához. Önnek joga van tiltakozni ez ellen a feldolgozás ellen, testreszabni választásait, és bármikor visszavonni hozzájárulását.',
			partnersLink: '{count} partner',
			scopeGroup:
				'A választása az ebben a csoportban lévő összes weboldalunkra vonatkozik.',
			scopeServiceSpecific:
				'Az Ön hozzájárulása csak erre a webhelyre vonatkozik, és nem érinti más szolgáltatásokat.',
			title: 'Adatvédelmi beállítások',
		},
		common: {
			acceptAll: 'Összes elfogadása',
			clearSelection: 'Törlés',
			customPartner: 'IAB-n kívüli egyedi partner',
			customize: 'Testreszabás',
			loading: 'Betöltés...',
			rejectAll: 'Összes elutasítása',
			saveSettings: 'Beállítások mentése',
			showingSelectedVendor: 'A kiválasztott szolgáltató megjelenítése',
		},
		preferenceCenter: {
			description:
				'Testreszabhatja adatvédelmi beállításait itt. Kiválaszthatja, hogy milyen típusú sütiket és nyomkövető technológiákat engedélyez.',
			footer: {
				consentStorage:
					'A hozzájárulási beállításokat egy "euconsent-v2" nevű sütiben tároljuk 13 hónapig. A tárolási időtartam megújulhat, amikor Ön frissíti a beállításait.',
			},
			purposeItem: {
				examples: 'Példák',
				legitimateInterest: 'Jogos érdek',
				objectButton: 'Tiltakozás',
				objected: 'Tiltakozott',
				partners: '{count} partner',
				partnersUsingPurpose: 'Ezt a célt használó partnerek',
				rightToObject:
					'Önnek joga van tiltakozni a jogos érdeken alapuló adatkezelés ellen.',
				vendorsUseLegitimateInterest:
					'{count} szolgáltató jogos érdekre hivatkozik',
				withYourPermission: 'Az Ön engedélyével',
			},
			specialPurposes: {
				title: 'Alapvető funkciók (szükséges)',
				tooltip:
					'Ezek a webhely működéséhez és biztonságához szükségesek. Az IAB TCF szerint Ön nem tiltakozhat ezen különleges célok ellen.',
			},
			tabs: {
				purposes: 'Célok',
				vendors: 'Szolgáltatók',
			},
			title: 'Adatvédelmi beállítások',
			vendorList: {
				customVendorsHeading: 'Egyedi partnerek',
				customVendorsNotice:
					'Ezek olyan egyedi partnerek, akik nincsenek regisztrálva az IAB Transparency & Consent Framework (TCF) rendszerében. Az Ön hozzájárulása alapján kezelik az adatokat, és az IAB-regisztrált szolgáltatóktól eltérő adatvédelmi gyakorlatot folytathatnak.',
				dataCategories: 'Adatkategóriák',
				features: 'Funkciók',
				iabVendorsHeading: 'IAB regisztrált szolgáltatók',
				iabVendorsNotice:
					'Ezek a partnerek regisztrálva vannak az IAB Transparency & Consent Framework (TCF) rendszerében, amely a hozzájárulások kezelésének iparági szabványa',
				legitimateInterest: 'Jogos érdek',
				maxAge: 'Max. élettartam: {days} nap',
				nonCookieAccess: 'Nem süti alapú hozzáférés',
				privacyPolicy: 'Adatvédelmi szabályzat',
				purposes: 'Célok',
				requiredNotice: 'A webhely működéséhez szükséges, nem kapcsolható ki',
				retention: 'Megőrzés: {days} nap',
				search: 'Szolgáltatók keresése...',
				showingCount: '{total} szolgáltatóból {filtered} megjelenítése',
				specialFeatures: 'Különleges funkciók',
				specialPurposes: 'Különleges célok',
				storageDisclosure: 'Tárolási tájékoztató',
				usesCookies: 'Sütiket használ',
			},
		},
	},
	legalLinks: {
		cookiePolicy: 'Süti szabályzat',
		privacyPolicy: 'Adatvédelmi szabályzat',
		termsOfService: 'Felhasználási feltételek',
	},
};
export default translations;
