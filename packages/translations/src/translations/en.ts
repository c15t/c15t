import type { CompleteTranslations } from '../types';

export const translations: CompleteTranslations = {
	common: {
		acceptAll: 'Accept All',
		rejectAll: 'Reject All',
		customize: 'Customize',
		save: 'Save Settings',
	},
	cookieBanner: {
		title: 'We value your privacy',
		description:
			'This site uses cookies to improve your browsing experience, analyze site traffic, and show personalized content.',
	},
	consentManagerDialog: {
		title: 'Privacy Settings',
		description:
			'Customize your privacy settings here. You can choose which types of cookies and tracking technologies you allow.',
	},
	consentTypes: {
		necessary: {
			title: 'Strictly Necessary',
			description:
				'These cookies are essential for the website to function properly and cannot be disabled.',
		},
		functionality: {
			title: 'Functionality',
			description:
				'These cookies enable enhanced functionality and personalization of the website.',
		},
		marketing: {
			title: 'Marketing',
			description:
				'These cookies are used to deliver relevant advertisements and track their effectiveness.',
		},
		measurement: {
			title: 'Analytics',
			description:
				'These cookies help us understand how visitors interact with the website and improve its performance.',
		},
		experience: {
			title: 'Experience',
			description:
				'These cookies help us provide a better user experience and test new features.',
		},
	},
	frame: {
		title: 'Accept {category} consent to view this content.',
		actionButton: 'Enable {category} consent',
	},
	legalLinks: {
		privacyPolicy: 'Privacy Policy',
		cookiePolicy: 'Cookie Policy',
		termsOfService: 'Terms of Service',
	},
	iab: {
		banner: {
			title: 'Privacy Settings',
			description:
				'We and our {partnerCount} partners store and/or access information on your device and process personal data, such as unique identifiers and browsing data, for this website, to:',
			partnersLink: '{count} partners',
			andMore: 'And {count} more...',
			legitimateInterestNotice:
				'Some partners claim a legitimate interest to process your data. You have the right to object to this processing, customize your choices, and withdraw your consent at any time.',
		},
		preferenceCenter: {
			title: 'Privacy Settings',
			description:
				'Customize your privacy settings here. You can choose which types of cookies and tracking technologies you allow.',
			tabs: {
				purposes: 'Purposes',
				vendors: 'Vendors',
			},
			purposeItem: {
				partners: '{count} partners',
				vendorsUseLegitimateInterest:
					'{count} vendors claim legitimate interest',
				examples: 'Examples',
				partnersUsingPurpose: 'Partners Using This Purpose',
				withYourPermission: 'With Your Permission',
				legitimateInterest: 'Legitimate Interest',
				objectButton: 'Object',
				objected: 'Objected',
				rightToObject:
					'You have the right to object to processing based on legitimate interest.',
			},
			specialPurposes: {
				title: 'Essential Functions (Required)',
				tooltip:
					'These are required for site functionality and security. Per IAB TCF, you cannot object to these special purposes.',
			},
			vendorList: {
				search: 'Search vendors...',
				showingCount: '{filtered} of {total} vendors',
				iabVendorsHeading: 'IAB Registered Vendors',
				iabVendorsNotice:
					'These partners are registered with the IAB Transparency & Consent Framework (TCF), an industry standard for managing consent',
				customVendorsHeading: 'Custom Partners',
				customVendorsNotice:
					'These are custom partners not registered with IAB Transparency & Consent Framework (TCF). They process data based on your consent and may have different privacy practices than IAB-registered vendors.',
				purposes: 'Purposes',
				specialPurposes: 'Special Purposes',
				specialFeatures: 'Special Features',
				dataCategories: 'Data Categories',
				usesCookies: 'Uses Cookies',
				nonCookieAccess: 'Non-Cookie Access',
				maxAge: 'Max Age: {days}d',
				legitimateInterest: 'Leg. Interest',
				privacyPolicy: 'Privacy Policy',
				storageDisclosure: 'Storage Disclosure',
				requiredNotice: 'Required for site functionality, cannot be disabled',
			},
			footer: {
				consentStorage:
					'Consent preferences are stored in a cookie named "euconsent-v2" for 13 months.',
			},
		},
		common: {
			acceptAll: 'Accept All',
			rejectAll: 'Reject All',
			customize: 'Customize',
			saveSettings: 'Save Settings',
			loading: 'Loading...',
			showingSelectedVendor: 'Showing selected vendor',
			clearSelection: 'Clear',
			customPartner: 'Custom partner not registered with IAB',
		},
	},
};

export default translations;
