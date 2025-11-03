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
};
export default translations;
