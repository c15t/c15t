import type { Locale } from './locales';

// The site's own copy. c15t's banner and dialog copy lives in
// consent-i18n.ts; this file is only the shop around it.

const en = {
	footer: {
		contact: 'Contact',
		note: 'Northwind Coffee Roasters. Roasted in Portland, Oregon.',
		privacySettings: 'Privacy settings',
		shipping: 'Shipping',
		wholesale: 'Wholesale',
	},
	hero: {
		cta: 'Shop this week’s coffee',
		dek: 'We roast in Portland on Tuesdays and Fridays and ship within two days, whether you live in Hamburg, Lyon or São Paulo.',
		title: 'Fresh coffee, wherever you brew it',
	},
	language: 'Language',
	meta: {
		description:
			'Small-batch coffee from Northwind Coffee Roasters, shipped within two days of roasting.',
		title: 'Northwind Coffee | Small-batch roasters',
	},
	nav: {
		account: 'Account',
		cart: 'Cart',
		journal: 'Journal',
		label: 'Main',
		shop: 'Shop',
		subscriptions: 'Subscriptions',
	},
	preview: {
		label: 'Preview as a visitor from',
		outcome: {
			none: 'No banner. c15t’s default rules don’t ask for consent here.',
			'opt-in':
				'Opt-in. Analytics and ads wait for a yes, so the banner asks first.',
			'opt-out':
				'Opt-out. No banner. Analytics run until the visitor turns them off in Privacy settings.',
			unknown:
				'No location yet, so c15t applies its strictest rules and asks before anything optional runs.',
		},
		regions: {
			br: 'Brazil',
			de: 'Germany',
			usCa: 'California',
		},
	},
	roasts: {
		addToCart: 'Add to cart',
		currency: 'USD',
		items: [
			{
				name: 'Huila Pink Bourbon',
				notes: 'Raspberry, cane sugar, rose',
				origin: 'Colombia',
				price: 19,
			},
			{
				name: 'Yirgacheffe Konga',
				notes: 'Bergamot, peach, black tea',
				origin: 'Ethiopia',
				price: 21,
			},
			{
				name: 'Northwind House',
				notes: 'Milk chocolate, hazelnut, caramel',
				origin: 'Brazil and Guatemala',
				price: 16,
			},
		],
		title: 'This week’s roasts',
		weight: '250 g',
	},
};

export type Dictionary = typeof en;

const de: Dictionary = {
	footer: {
		contact: 'Kontakt',
		note: 'Northwind Coffee Roasters. Geröstet in Portland, Oregon.',
		privacySettings: 'Datenschutzeinstellungen',
		shipping: 'Versand',
		wholesale: 'Großhandel',
	},
	hero: {
		cta: 'Zu den Kaffees der Woche',
		dek: 'Wir rösten dienstags und freitags in Portland und verschicken innerhalb von zwei Tagen, ob nach Hamburg, Lyon oder São Paulo.',
		title: 'Frischer Kaffee, wo immer du ihn brühst',
	},
	language: 'Sprache',
	meta: {
		description:
			'Kaffee aus kleinen Chargen von Northwind Coffee Roasters, verschickt innerhalb von zwei Tagen nach der Röstung.',
		title: 'Northwind Coffee | Rösterei für kleine Chargen',
	},
	nav: {
		account: 'Konto',
		cart: 'Warenkorb',
		journal: 'Journal',
		label: 'Hauptmenü',
		shop: 'Shop',
		subscriptions: 'Abos',
	},
	preview: {
		label: 'Vorschau für Besucher aus',
		outcome: {
			none: 'Kein Banner. Die Standardregeln von c15t verlangen hier keine Einwilligung.',
			'opt-in':
				'Opt-in. Analyse und Werbung warten auf ein Ja, deshalb fragt das Banner zuerst.',
			'opt-out':
				'Opt-out. Kein Banner. Analyse läuft, bis der Besucher sie in den Datenschutzeinstellungen abschaltet.',
			unknown:
				'Noch kein Standort, also wendet c15t die strengsten Regeln an und fragt, bevor etwas Optionales läuft.',
		},
		regions: {
			br: 'Brasilien',
			de: 'Deutschland',
			usCa: 'Kalifornien',
		},
	},
	roasts: {
		addToCart: 'In den Warenkorb',
		currency: 'EUR',
		items: [
			{
				name: 'Huila Pink Bourbon',
				notes: 'Himbeere, Rohrzucker, Rose',
				origin: 'Kolumbien',
				price: 18,
			},
			{
				name: 'Yirgacheffe Konga',
				notes: 'Bergamotte, Pfirsich, Schwarztee',
				origin: 'Äthiopien',
				price: 20,
			},
			{
				name: 'Northwind House',
				notes: 'Vollmilchschokolade, Haselnuss, Karamell',
				origin: 'Brasilien und Guatemala',
				price: 15,
			},
		],
		title: 'Diese Woche geröstet',
		weight: '250 g',
	},
};

const fr: Dictionary = {
	footer: {
		contact: 'Contact',
		note: 'Northwind Coffee Roasters. Torréfié à Portland, Oregon.',
		privacySettings: 'Paramètres de confidentialité',
		shipping: 'Livraison',
		wholesale: 'Vente en gros',
	},
	hero: {
		cta: 'Les cafés de la semaine',
		dek: 'Nous torréfions à Portland le mardi et le vendredi et expédions dans les deux jours, que vous soyez à Hambourg, à Lyon ou à São Paulo.',
		title: 'Du café frais, où que vous l’infusiez',
	},
	language: 'Langue',
	meta: {
		description:
			'Du café torréfié en petites quantités par Northwind Coffee Roasters, expédié dans les deux jours suivant la torréfaction.',
		title: 'Northwind Coffee | Torréfacteur artisanal',
	},
	nav: {
		account: 'Compte',
		cart: 'Panier',
		journal: 'Journal',
		label: 'Menu principal',
		shop: 'Boutique',
		subscriptions: 'Abonnements',
	},
	preview: {
		label: 'Aperçu selon la région du visiteur',
		outcome: {
			none: 'Pas de bannière. Les règles par défaut de c15t ne demandent pas de consentement ici.',
			'opt-in':
				'Opt-in. Mesure d’audience et publicité attendent un oui, la bannière demande donc d’abord.',
			'opt-out':
				'Opt-out. Pas de bannière. La mesure d’audience tourne jusqu’à ce que le visiteur la coupe dans les paramètres de confidentialité.',
			unknown:
				'Pas encore de localisation : c15t applique ses règles les plus strictes et demande avant tout traitement optionnel.',
		},
		regions: {
			br: 'Brésil',
			de: 'Allemagne',
			usCa: 'Californie',
		},
	},
	roasts: {
		addToCart: 'Ajouter au panier',
		currency: 'EUR',
		items: [
			{
				name: 'Huila Pink Bourbon',
				notes: 'Framboise, sucre de canne, rose',
				origin: 'Colombie',
				price: 18,
			},
			{
				name: 'Yirgacheffe Konga',
				notes: 'Bergamote, pêche, thé noir',
				origin: 'Éthiopie',
				price: 20,
			},
			{
				name: 'Northwind House',
				notes: 'Chocolat au lait, noisette, caramel',
				origin: 'Brésil et Guatemala',
				price: 15,
			},
		],
		title: 'Torréfiés cette semaine',
		weight: '250 g',
	},
};

const dictionaries: Record<Locale, Dictionary> = { de, en, fr };

export const getDictionary = (locale: Locale): Dictionary =>
	dictionaries[locale];
