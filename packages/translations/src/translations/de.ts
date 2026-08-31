import type { CompleteTranslations } from '../types';

export const translations: CompleteTranslations = {
	common: {
		acceptAll: 'Alle akzeptieren',
		close: 'Schließen',
		customize: 'Anpassen',
		rejectAll: 'Alle ablehnen',
		save: 'Einstellungen speichern',
		securedBy: 'Gesichert durch',
	},
	consentManagerDialog: {
		description:
			'Passe deine Datenschutz-Einstellungen hier an. Wähle aus, welche Arten von Cookies und Tracking-Technologien zugelassen werden.',
		title: 'Einstellungen',
	},
	consentTypes: {
		experience: {
			description:
				'Diese Cookies helfen uns dabei, ein besseres Nutzerlebnis zu bieten und neue Funktionen zu testen.',
			title: 'Erfahrung',
		},
		functionality: {
			description:
				'Diese Cookies ermöglichen erweiterte Funktionalitäten und eine Personalisierung der Website.',
			title: 'Funktionalität',
		},
		marketing: {
			description:
				'Diese Cookies werden verwendet, um relevante Werbung anzuzeigen und ihre Wirksamkeit zu messen.',
			title: 'Marketing',
		},
		measurement: {
			description:
				'Diese Cookies helfen uns zu verstehen, wie Besucher mit der Website interagieren um die Surf-Erfahrung zu verbessern.',
			title: 'Analyse',
		},
		necessary: {
			description:
				'Diese Cookies sind für das reibungslose Funktionieren der Website unerlässlich und können nicht deaktiviert werden.',
			title: 'Unbedingt erforderliche Cookies',
		},
	},
	cookieBanner: {
		description:
			'Diese Website verwendet Cookies, um deine Surf-Erfahrung zu verbessern, den Seitenverkehr zu analysieren und persönliche Inhalte anzuzeigen.',
		title: 'Wir respektieren deine Privatsphäre.',
	},
	frame: {
		actionButton: 'Zustimmung für {category} aktivieren',
		error: 'This content could not be loaded.',
		loading: 'Loading content…',
		policyBlocked:
			"This content is unavailable under your region's consent policy.",
		title: 'Akzeptieren Sie {category}, um diesen Inhalt anzuzeigen.',
	},
	iab: {
		banner: {
			andMore: 'Und {count} weitere...',
			description:
				'Wir und unsere {partnerCount} Partner speichern und/oder greifen auf Informationen auf deinem Gerät zu und verarbeiten personenbezogene Daten, wie eindeutige Kennungen und Browsing-Daten, für diese Website, um:',
			legitimateInterestNotice:
				'Einige Partner beanspruchen ein berechtigtes Interesse zur Verarbeitung deiner Daten. Du hast das Recht, dieser Verarbeitung zu widersprechen, deine Auswahl anzupassen und deine Einwilligung jederzeit zu widerrufen.',
			partnersLink: '{count} Partner',
			scopeGroup:
				'Deine Auswahl gilt für alle unsere Websites in dieser Gruppe.',
			scopeServiceSpecific:
				'Deine Einwilligung gilt nur für diese Website und hat keinen Einfluss auf andere Dienste.',
			title: 'Datenschutz-Einstellungen',
		},
		common: {
			acceptAll: 'Alle akzeptieren',
			clearSelection: 'Löschen',
			customPartner: 'Benutzerdefinierter Partner, nicht beim IAB registriert',
			customize: 'Anpassen',
			loading: 'Wird geladen...',
			rejectAll: 'Alle ablehnen',
			saveSettings: 'Einstellungen speichern',
			showingSelectedVendor: 'Ausgewählter Anbieter wird angezeigt',
		},
		preferenceCenter: {
			description:
				'Passe deine Datenschutz-Einstellungen hier an. Wähle aus, welche Arten von Cookies und Tracking-Technologien zugelassen werden.',
			footer: {
				consentStorage:
					'Einwilligungspräferenzen werden in einem Cookie namens "euconsent-v2" für 13 Monate gespeichert. Die Speicherdauer kann erneut beginnen, wenn du deine Präferenzen aktualisierst.',
			},
			purposeItem: {
				examples: 'Beispiele',
				legitimateInterest: 'Berechtigtes Interesse',
				objectButton: 'Widersprechen',
				objected: 'Widersprochen',
				partners: '{count} Partner',
				partnersUsingPurpose: 'Partner, die diesen Zweck nutzen',
				rightToObject:
					'Du hast das Recht, der Verarbeitung auf Grundlage berechtigten Interesses zu widersprechen.',
				vendorsUseLegitimateInterest:
					'{count} Anbieter beanspruchen berechtigtes Interesse',
				withYourPermission: 'Mit deiner Erlaubnis',
			},
			specialPurposes: {
				title: 'Wesentliche Funktionen (erforderlich)',
				tooltip:
					'Diese sind für die Funktionalität und Sicherheit der Website erforderlich. Gemäß IAB TCF kannst du diesen besonderen Zwecken nicht widersprechen.',
			},
			tabs: {
				purposes: 'Zwecke',
				vendors: 'Anbieter',
			},
			title: 'Datenschutz-Einstellungen',
			vendorList: {
				customVendorsHeading: 'Benutzerdefinierte Partner',
				customVendorsNotice:
					'Dies sind benutzerdefinierte Partner, die nicht beim IAB Transparency & Consent Framework (TCF) registriert sind. Sie verarbeiten Daten auf Grundlage deiner Einwilligung und können andere Datenschutzpraktiken haben als IAB-registrierte Anbieter.',
				dataCategories: 'Datenkategorien',
				features: 'Merkmale',
				iabVendorsHeading: 'IAB-registrierte Anbieter',
				iabVendorsNotice:
					'Diese Partner sind beim IAB Transparency & Consent Framework (TCF) registriert, einem Industriestandard für die Verwaltung von Einwilligungen',
				legitimateInterest: 'Berecht. Interesse',
				maxAge: 'Max. Alter: {days} Tage',
				nonCookieAccess: 'Zugriff ohne Cookies',
				privacyPolicy: 'Datenschutzerklärung',
				purposes: 'Zwecke',
				requiredNotice:
					'Erforderlich für die Funktionalität der Website, kann nicht deaktiviert werden',
				retention: 'Aufbewahrung: {days} Tage',
				search: 'Anbieter suchen...',
				showingCount: '{filtered} von {total} Anbietern',
				specialFeatures: 'Besondere Merkmale',
				specialPurposes: 'Besondere Zwecke',
				storageDisclosure: 'Speicheroffenlegung',
				usesCookies: 'Verwendet Cookies',
			},
		},
	},
	legalLinks: {
		cookiePolicy: 'Cookie-Richtlinie',
		privacyPolicy: 'Datenschutzerklärung',
		termsOfService: 'Nutzungsbedingungen',
	},
};
export default translations;
