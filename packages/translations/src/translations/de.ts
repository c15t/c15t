import type { CompleteTranslations } from '../types';
export const translations: CompleteTranslations = {
	common: {
		acceptAll: 'Alle akzeptieren',
		rejectAll: 'Alle ablehnen',
		customize: 'Anpassen',
		save: 'Einstellungen speichern',
	},
	cookieBanner: {
		title: 'Wir respektieren Deine Privatsphäre.',
		description:
			'Diese Website verwendet Cookies, um Deine Surf-Erfahrung zu verbessern, den Seitenverkehr zu analysieren und persönliche Inhalte anzuzeigen.',
	},
	consentManagerDialog: {
		title: 'Einstellungen',
		description:
			'Passe Deine Datenschutz-Einstellungen hier an. Wähle aus, welche Arten von Cookies und Tracking-Technologien zugelassen werden.',
	},
	consentTypes: {
		necessary: {
			title: 'Unbedingt erforderliche Cookies',
			description:
				'Diese Cookies sind für das reibungslose Funktionieren der Website unerlässlich und können nicht deaktiviert werden.',
		},
		functionality: {
			title: 'Funktionalität',
			description:
				'Diese Cookies ermöglichen erweiterte Funktionalitäten und eine Personalisierung der Website.',
		},
		marketing: {
			title: 'Marketing',
			description:
				'Diese Cookies werden verwendet, um relevante Werbung anzuzeigen und ihre Wirksamkeit zu messen.',
		},
		measurement: {
			title: 'Analyse',
			description:
				'Diese Cookies helfen uns zu verstehen, wie Besucher mit der Website interagieren um die Surf-Erfahrung zu verbessern.',
		},
		experience: {
			title: 'Erfahrung',
			description:
				'Diese Cookies helfen uns dabei, ein besseres Nutzerlebnis zu bieten und neue Funktionen zu testen.',
		},
	},
	frame: {
		title: 'Akzeptieren Sie {category}, um diesen Inhalt anzuzeigen.',
		actionButton: 'Zustimmung für {category} aktivieren',
	},
	legalLinks: {
		privacyPolicy: 'Datenschutzerklärung',
		cookiePolicy: 'Cookie-Richtlinie',
		termsOfService: 'Nutzungsbedingungen',
	},
	iab: {
		banner: {
			title: 'Datenschutz-Einstellungen',
			description:
				'Wir und unsere {partnerCount} Partner speichern und/oder greifen auf Informationen auf Deinem Gerät zu und verarbeiten personenbezogene Daten, wie eindeutige Kennungen und Browsing-Daten, für diese Website, um:',
			partnersLink: '{count} Partner',
			andMore: 'Und {count} weitere...',
			legitimateInterestNotice:
				'Einige Partner beanspruchen ein berechtigtes Interesse zur Verarbeitung Deiner Daten. Du hast das Recht, dieser Verarbeitung zu widersprechen, Deine Auswahl anzupassen und Deine Einwilligung jederzeit zu widerrufen.',
		},
		preferenceCenter: {
			title: 'Datenschutz-Einstellungen',
			description:
				'Passe Deine Datenschutz-Einstellungen hier an. Wähle aus, welche Arten von Cookies und Tracking-Technologien zugelassen werden.',
			tabs: {
				purposes: 'Zwecke',
				vendors: 'Anbieter',
			},
			purposeItem: {
				partners: '{count} Partner',
				vendorsUseLegitimateInterest:
					'{count} Anbieter beanspruchen berechtigtes Interesse',
				examples: 'Beispiele',
				partnersUsingPurpose: 'Partner, die diesen Zweck nutzen',
				withYourPermission: 'Mit Deiner Erlaubnis',
				legitimateInterest: 'Berechtigtes Interesse',
				objectButton: 'Widersprechen',
				objected: 'Widersprochen',
				rightToObject:
					'Du hast das Recht, der Verarbeitung auf Grundlage berechtigten Interesses zu widersprechen.',
			},
			specialPurposes: {
				title: 'Wesentliche Funktionen (erforderlich)',
				tooltip:
					'Diese sind für die Funktionalität und Sicherheit der Website erforderlich. Gemäß IAB TCF kannst Du diesen besonderen Zwecken nicht widersprechen.',
			},
			vendorList: {
				search: 'Anbieter suchen...',
				showingCount: '{filtered} von {total} Anbietern',
				iabVendorsHeading: 'IAB-registrierte Anbieter',
				iabVendorsNotice:
					'Diese Partner sind beim IAB Transparency & Consent Framework (TCF) registriert, einem Industriestandard für die Verwaltung von Einwilligungen',
				customVendorsHeading: 'Benutzerdefinierte Partner',
				customVendorsNotice:
					'Dies sind benutzerdefinierte Partner, die nicht beim IAB Transparency & Consent Framework (TCF) registriert sind. Sie verarbeiten Daten auf Grundlage Ihrer Einwilligung und können andere Datenschutzpraktiken haben als IAB-registrierte Anbieter.',
				purposes: 'Zwecke',
				specialPurposes: 'Besondere Zwecke',
				specialFeatures: 'Besondere Merkmale',
				dataCategories: 'Datenkategorien',
				usesCookies: 'Verwendet Cookies',
				nonCookieAccess: 'Zugriff ohne Cookies',
				maxAge: 'Max. Alter: {days} Tage',
				legitimateInterest: 'Berecht. Interesse',
				privacyPolicy: 'Datenschutzerklärung',
				storageDisclosure: 'Speicheroffenlegung',
				requiredNotice:
					'Erforderlich für die Funktionalität der Website, kann nicht deaktiviert werden',
			},
			footer: {
				consentStorage:
					'Einwilligungspräferenzen werden in einem Cookie namens "euconsent-v2" für 13 Monate gespeichert.',
			},
		},
		common: {
			acceptAll: 'Alle akzeptieren',
			rejectAll: 'Alle ablehnen',
			customize: 'Anpassen',
			saveSettings: 'Einstellungen speichern',
			loading: 'Wird geladen...',
			showingSelectedVendor: 'Ausgewählter Anbieter wird angezeigt',
			clearSelection: 'Löschen',
			customPartner: 'Benutzerdefinierter Partner, nicht beim IAB registriert',
		},
	},
};
export default translations;
