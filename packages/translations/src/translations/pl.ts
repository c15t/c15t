import type { CompleteTranslations } from '../types';
export const translations: CompleteTranslations = {
	common: {
		acceptAll: 'Zaakceptuj wszystkie',
		rejectAll: 'Odrzuć wszystkie',
		customize: 'Dostosuj',
		save: 'Zapisz ustawienia',
	},
	cookieBanner: {
		title: 'Cenimy Twoją prywatność',
		description:
			'Ta strona używa plików cookie, aby poprawić Twoje wrażenia z przeglądania, analizować ruch na stronie i wyświetlać spersonalizowane treści.',
	},
	consentManagerDialog: {
		title: 'Ustawienia prywatności',
		description:
			'Dostosuj tutaj swoje ustawienia prywatności. Możesz wybrać, które rodzaje plików cookie i technologii śledzenia chcesz zaakceptować.',
	},
	consentTypes: {
		necessary: {
			title: 'Ściśle niezbędne',
			description:
				'Te pliki cookie są niezbędne do prawidłowego funkcjonowania strony internetowej i nie można ich wyłączyć.',
		},
		functionality: {
			title: 'Funkcjonalność',
			description:
				'Te pliki cookie umożliwiają ulepszoną funkcjonalność i personalizację strony internetowej.',
		},
		marketing: {
			title: 'Marketing',
			description:
				'Te pliki cookie są używane do dostarczania odpowiednich reklam i śledzenia ich skuteczności.',
		},
		measurement: {
			title: 'Analityka',
			description:
				'Te pliki cookie pomagają nam zrozumieć, jak odwiedzający korzystają ze strony internetowej, i poprawić jej wydajność.',
		},
		experience: {
			title: 'Doświadczenie',
			description:
				'Te pliki cookie pomagają nam zapewnić lepsze wrażenia użytkownika i testować nowe funkcje.',
		},
	},
	frame: {
		title: 'Zaakceptuj zgodę na {category}, aby wyświetlić tę treść.',
		actionButton: 'Włącz zgodę na {category}',
	},
	legalLinks: {
		privacyPolicy: 'Polityka prywatności',
		cookiePolicy: 'Polityka plików cookie',
		termsOfService: 'Regulamin',
	},
	iab: {
		banner: {
			title: 'Ustawienia prywatności',
			description:
				'My i nasi {partnerCount} partnerzy przechowujemy i/lub uzyskujemy dostęp do informacji na urządzeniu oraz przetwarzamy dane osobowe, takie jak unikalne identyfikatory i dane dotyczące przeglądania, w tej witrynie, aby:',
			partnersLink: '{count} partnerów',
			andMore: 'I {count} więcej...',
			legitimateInterestNotice:
				'Niektórzy partnerzy powołują się na uzasadniony interes w przetwarzaniu Twoich danych. Masz prawo sprzeciwić się temu przetwarzaniu, dostosować swoje wybory i wycofać zgodę w dowolnym momencie.',
		},
		preferenceCenter: {
			title: 'Ustawienia prywatności',
			description:
				'Dostosuj tutaj swoje ustawienia prywatności. Możesz wybrać, które rodzaje plików cookie i technologii śledzenia chcesz zaakceptować.',
			tabs: {
				purposes: 'Cele',
				vendors: 'Dostawcy',
			},
			purposeItem: {
				partners: '{count} partnerów',
				vendorsUseLegitimateInterest:
					'{count} dostawców powołuje się na uzasadniony interes',
				examples: 'Przykłady',
				partnersUsingPurpose: 'Partnerzy korzystający z tego celu',
				withYourPermission: 'Za Twoją zgodą',
				legitimateInterest: 'Uzasadniony interes',
				objectButton: 'Sprzeciw',
				objected: 'Zgłoszono sprzeciw',
				rightToObject:
					'Masz prawo sprzeciwić się przetwarzaniu opartemu na uzasadnionym interesie.',
			},
			specialPurposes: {
				title: 'Funkcje niezbędne (wymagane)',
				tooltip:
					'Są one wymagane dla funkcjonalności i bezpieczeństwa witryny. Zgodnie z IAB TCF nie można sprzeciwić się tym celom specjalnym.',
			},
			vendorList: {
				search: 'Szukaj dostawców...',
				showingCount: '{filtered} z {total} dostawców',
				iabVendorsHeading: 'Dostawcy zarejestrowani w IAB',
				iabVendorsNotice:
					'Ci partnerzy są zarejestrowani w IAB Transparency & Consent Framework (TCF), standardzie branżowym dotyczącym zarządzania zgodami',
				customVendorsHeading: 'Partnerzy niestandardowi',
				customVendorsNotice:
					'Są to partnerzy niestandardowi, którzy nie są zarejestrowani w IAB Transparency & Consent Framework (TCF). Przetwarzają dane na podstawie Twojej zgody i mogą stosować inne praktyki prywatności niż dostawcy zarejestrowani w IAB.',
				purposes: 'Cele',
				specialPurposes: 'Cele specjalne',
				specialFeatures: 'Funkcje specjalne',
				dataCategories: 'Kategorie danych',
				usesCookies: 'Używa plików cookie',
				nonCookieAccess: 'Dostęp bez plików cookie',
				maxAge: 'Maks. wiek: {days}d',
				legitimateInterest: 'Uzasadn. interes',
				privacyPolicy: 'Polityka prywatności',
				storageDisclosure: 'Ujawnienie informacji o przechowywaniu',
				requiredNotice:
					'Wymagane dla funkcjonalności witryny, nie można wyłączyć',
			},
			footer: {
				consentStorage:
					'Preferencje dotyczące zgody są przechowywane w pliku cookie o nazwie „euconsent-v2” przez 13 miesięcy.',
			},
		},
		common: {
			acceptAll: 'Zaakceptuj wszystkie',
			rejectAll: 'Odrzuć wszystkie',
			customize: 'Dostosuj',
			saveSettings: 'Zapisz ustawienia',
			loading: 'Ładowanie...',
			showingSelectedVendor: 'Pokazywanie wybranego dostawcy',
			clearSelection: 'Wyczyść',
			customPartner: 'Partner niestandardowy niezarejestrowany w IAB',
		},
	},
};
export default translations;
