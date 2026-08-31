import type { CompleteTranslations } from '../types';

export const translations: CompleteTranslations = {
	common: {
		acceptAll: 'Zaakceptuj wszystkie',
		close: 'Zamknij',
		customize: 'Dostosuj',
		rejectAll: 'Odrzuć wszystkie',
		save: 'Zapisz ustawienia',
		securedBy: 'Zabezpieczone przez',
	},
	consentManagerDialog: {
		description:
			'Dostosuj tutaj swoje ustawienia prywatności. Możesz wybrać, które rodzaje plików cookie i technologii śledzenia chcesz zaakceptować.',
		title: 'Ustawienia prywatności',
	},
	consentTypes: {
		experience: {
			description:
				'Te pliki cookie pomagają nam zapewnić lepsze wrażenia użytkownika i testować nowe funkcje.',
			title: 'Doświadczenie',
		},
		functionality: {
			description:
				'Te pliki cookie umożliwiają ulepszoną funkcjonalność i personalizację strony internetowej.',
			title: 'Funkcjonalność',
		},
		marketing: {
			description:
				'Te pliki cookie są używane do dostarczania odpowiednich reklam i śledzenia ich skuteczności.',
			title: 'Marketing',
		},
		measurement: {
			description:
				'Te pliki cookie pomagają nam zrozumieć, jak odwiedzający korzystają ze strony internetowej, i poprawić jej wydajność.',
			title: 'Analityka',
		},
		necessary: {
			description:
				'Te pliki cookie są niezbędne do prawidłowego funkcjonowania strony internetowej i nie można ich wyłączyć.',
			title: 'Ściśle niezbędne',
		},
	},
	cookieBanner: {
		description:
			'Ta strona używa plików cookie, aby poprawić Twoje wrażenia z przeglądania, analizować ruch na stronie i wyświetlać spersonalizowane treści.',
		title: 'Cenimy Twoją prywatność',
	},
	frame: {
		actionButton: 'Włącz zgodę na {category}',
		error: 'This content could not be loaded.',
		loading: 'Loading content…',
		policyBlocked:
			"This content is unavailable under your region's consent policy.",
		title: 'Zaakceptuj zgodę na {category}, aby wyświetlić tę treść.',
	},
	iab: {
		banner: {
			andMore: 'I {count} więcej...',
			description:
				'My i nasi {partnerCount} partnerzy przechowujemy i/lub uzyskujemy dostęp do informacji na urządzeniu oraz przetwarzamy dane osobowe, takie jak unikalne identyfikatory i dane dotyczące przeglądania, w tej witrynie, aby:',
			legitimateInterestNotice:
				'Niektórzy partnerzy powołują się na uzasadniony interes w przetwarzaniu Twoich danych. Masz prawo sprzeciwić się temu przetwarzaniu, dostosować swoje wybory i wycofać zgodę w dowolnym momencie.',
			partnersLink: '{count} partnerów',
			scopeGroup:
				'Twój wybór ma zastosowanie do wszystkich naszych stron w tej grupie.',
			scopeServiceSpecific:
				'Twoja zgoda dotyczy tylko tej strony internetowej i nie wpływa na inne usługi.',
			title: 'Ustawienia prywatności',
		},
		common: {
			acceptAll: 'Zaakceptuj wszystkie',
			clearSelection: 'Wyczyść',
			customPartner: 'Partner niestandardowy niezarejestrowany w IAB',
			customize: 'Dostosuj',
			loading: 'Ładowanie...',
			rejectAll: 'Odrzuć wszystkie',
			saveSettings: 'Zapisz ustawienia',
			showingSelectedVendor: 'Pokazywanie wybranego dostawcy',
		},
		preferenceCenter: {
			description:
				'Dostosuj tutaj swoje ustawienia prywatności. Możesz wybrać, które rodzaje plików cookie i technologii śledzenia chcesz zaakceptować.',
			footer: {
				consentStorage:
					'Preferencje dotyczące zgody są przechowywane w pliku cookie o nazwie „euconsent-v2” przez 13 miesięcy. Okres przechowywania może zostać odnowiony, gdy zaktualizujesz swoje preferencje.',
			},
			purposeItem: {
				examples: 'Przykłady',
				legitimateInterest: 'Uzasadniony interes',
				objectButton: 'Sprzeciw',
				objected: 'Zgłoszono sprzeciw',
				partners: '{count} partnerów',
				partnersUsingPurpose: 'Partnerzy korzystający z tego celu',
				rightToObject:
					'Masz prawo sprzeciwić się przetwarzaniu opartemu na uzasadnionym interesie.',
				vendorsUseLegitimateInterest:
					'{count} dostawców powołuje się na uzasadniony interes',
				withYourPermission: 'Za Twoją zgodą',
			},
			specialPurposes: {
				title: 'Funkcje niezbędne (wymagane)',
				tooltip:
					'Są one wymagane dla funkcjonalności i bezpieczeństwa witryny. Zgodnie z IAB TCF nie można sprzeciwić się tym celom specjalnym.',
			},
			tabs: {
				purposes: 'Cele',
				vendors: 'Dostawcy',
			},
			title: 'Ustawienia prywatności',
			vendorList: {
				customVendorsHeading: 'Partnerzy niestandardowi',
				customVendorsNotice:
					'Są to partnerzy niestandardowi, którzy nie są zarejestrowani w IAB Transparency & Consent Framework (TCF). Przetwarzają dane na podstawie Twojej zgody i mogą stosować inne praktyki prywatności niż dostawcy zarejestrowani w IAB.',
				dataCategories: 'Kategorie danych',
				features: 'Funkcje',
				iabVendorsHeading: 'Dostawcy zarejestrowani w IAB',
				iabVendorsNotice:
					'Ci partnerzy są zarejestrowani w IAB Transparency & Consent Framework (TCF), standardzie branżowym dotyczącym zarządzania zgodami',
				legitimateInterest: 'Uzasadn. interes',
				maxAge: 'Maks. wiek: {days}d',
				nonCookieAccess: 'Dostęp bez plików cookie',
				privacyPolicy: 'Polityka prywatności',
				purposes: 'Cele',
				requiredNotice:
					'Wymagane dla funkcjonalności witryny, nie można wyłączyć',
				retention: 'Przechowywanie: {days}d',
				search: 'Szukaj dostawców...',
				showingCount: '{filtered} z {total} dostawców',
				specialFeatures: 'Funkcje specjalne',
				specialPurposes: 'Cele specjalne',
				storageDisclosure: 'Ujawnienie informacji o przechowywaniu',
				usesCookies: 'Używa plików cookie',
			},
		},
	},
	legalLinks: {
		cookiePolicy: 'Polityka plików cookie',
		privacyPolicy: 'Polityka prywatności',
		termsOfService: 'Regulamin',
	},
};
export default translations;
