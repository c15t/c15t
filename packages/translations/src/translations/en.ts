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
};

export default translations;
