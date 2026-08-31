import type { CompleteTranslations } from '../types';

export const translations: CompleteTranslations = {
	common: {
		acceptAll: 'सभी स्वीकार करें',
		close: 'बंद करें',
		customize: 'अनुकूलित करें',
		rejectAll: 'सभी अस्वीकार करें',
		save: 'सेटिंग्स सेव करें',
		securedBy: 'सुरक्षित द्वारा',
	},
	consentManagerDialog: {
		description:
			'यहां अपनी गोपनीयता सेटिंग्स अनुकूलित करें। आप चुन सकते हैं कि किस प्रकार की कुकीज़ और ट्रैकिंग तकनीकों की अनुमति देनी है।',
		title: 'गोपनीयता सेटिंग्स',
	},
	consentTypes: {
		experience: {
			description:
				'ये कुकीज़ हमें बेहतर उपयोगकर्ता अनुभव प्रदान करने और नई सुविधाओं का परीक्षण करने में मदद करती हैं।',
			title: 'अनुभव',
		},
		functionality: {
			description:
				'ये कुकीज़ वेबसाइट की उन्नत कार्यक्षमता और वैयक्तिकरण को सक्षम करती हैं।',
			title: 'कार्यक्षमता',
		},
		marketing: {
			description:
				'इन कुकीज़ का उपयोग प्रासंगिक विज्ञापन देने और उनकी प्रभावशीलता को ट्रैक करने के लिए किया जाता है।',
			title: 'मार्केटिंग',
		},
		measurement: {
			description:
				'ये कुकीज़ हमें यह समझने में मदद करती हैं कि विज़िटर वेबसाइट के साथ कैसे इंटरैक्ट करते हैं और इसके प्रदर्शन को बेहतर बनाते हैं।',
			title: 'एनालिटिक्स',
		},
		necessary: {
			description:
				'ये कुकीज़ वेबसाइट के सही ढंग से काम करने के लिए आवश्यक हैं और इन्हें अक्षम नहीं किया जा सकता।',
			title: 'अत्यंत आवश्यक',
		},
	},
	cookieBanner: {
		description:
			'यह साइट आपके ब्राउज़िंग अनुभव को बेहतर बनाने, साइट ट्रैफ़िक का विश्लेषण करने और व्यक्तिगत सामग्री दिखाने के लिए कुकीज़ का उपयोग करती है।',
		title: 'हम आपकी गोपनीयता को महत्व देते हैं',
	},
	frame: {
		actionButton: '{category} सहमति सक्षम करें',
		error: 'This content could not be loaded.',
		loading: 'Loading content…',
		policyBlocked: 'यह सामग्री आपके क्षेत्र की सहमति नीति के अंतर्गत उपलब्ध नहीं है।',
		title: 'इस सामग्री को देखने के लिए {category} सहमति स्वीकार करें।',
	},
	iab: {
		banner: {
			andMore: 'और {count} अधिक...',
			description:
				'हम और हमारे {partnerCount} साझेदार आपके डिवाइस पर जानकारी संग्रहीत और/या एक्सेस करते हैं तथा व्यक्तिगत डेटा, जैसे विशिष्ट पहचानकर्ता और ब्राउज़िंग डेटा, को इस वेबसाइट के लिए संसाधित करते हैं, ताकि:',
			legitimateInterestNotice:
				'कुछ साझेदार आपके डेटा को संसाधित करने के लिए वैध हित का दावा करते हैं। आपको इस प्रसंस्करण पर आपत्ति करने, अपनी पसंद को अनुकूलित करने और किसी भी समय अपनी सहमति वापस लेने का अधिकार है।',
			partnersLink: '{count} साझेदार',
			scopeGroup: 'आपकी पसंद हमारे समूह की सभी वेबसाइटों पर लागू होती है।',
			scopeServiceSpecific:
				'आपकी सहमति केवल इस वेबसाइट पर लागू होती है और अन्य सेवाओं को प्रभावित नहीं करेगी।',
			title: 'गोपनीयता सेटिंग्स',
		},
		common: {
			acceptAll: 'सभी स्वीकार करें',
			clearSelection: 'साफ़ करें',
			customPartner: 'IAB के साथ पंजीकृत नहीं कस्टम साझेदार',
			customize: 'अनुकूलित करें',
			loading: 'लोड हो रहा है...',
			rejectAll: 'सभी अस्वीकार करें',
			saveSettings: 'सेटिंग्स सहेजें',
			showingSelectedVendor: 'चयनित विक्रेता दिखाया जा रहा है',
		},
		preferenceCenter: {
			description:
				'यहां अपनी गोपनीयता सेटिंग्स अनुकूलित करें। आप चुन सकते हैं कि किस प्रकार की कुकीज़ और ट्रैकिंग तकनीकों की अनुमति देनी है।',
			footer: {
				consentStorage:
					'सहमति प्राथमिकताएं "euconsent-v2" नामक कुकी में 13 महीनों के लिए संग्रहीत की जाती हैं। जब आप अपनी प्राथमिकताएं अपडेट करते हैं तो भंडारण अवधि को रीफ्रेश किया जा सकता है।',
			},
			purposeItem: {
				examples: 'उदाहरण',
				legitimateInterest: 'वैध हित',
				objectButton: 'आपत्ति करें',
				objected: 'आपत्ति की गई',
				partners: '{count} साझेदार',
				partnersUsingPurpose: 'इस उद्देश्य का उपयोग करने वाले साझेदार',
				rightToObject:
					'आपको वैध हित के आधार पर प्रसंस्करण पर आपत्ति करने का अधिकार है।',
				vendorsUseLegitimateInterest: '{count} विक्रेता वैध हित का दावा करते हैं',
				withYourPermission: 'आपकी अनुमति से',
			},
			specialPurposes: {
				title: 'आवश्यक कार्य (अनिवार्य)',
				tooltip:
					'ये साइट की कार्यक्षमता और सुरक्षा के लिए आवश्यक हैं। IAB TCF के अनुसार, आप इन विशेष उद्देश्यों पर आपत्ति नहीं कर सकते।',
			},
			tabs: {
				purposes: 'उद्देश्य',
				vendors: 'विक्रेता',
			},
			title: 'गोपनीयता सेटिंग्स',
			vendorList: {
				customVendorsHeading: 'कस्टम साझेदार',
				customVendorsNotice:
					'ये कस्टम साझेदार हैं जो IAB पारदर्शिता और सहमति फ्रेमवर्क (TCF) के साथ पंजीकृत नहीं हैं। वे आपकी सहमति के आधार पर डेटा संसाधित करते हैं और IAB-पंजीकृत विक्रेताओं की तुलना में भिन्न गोपनीयता प्रथाएं रख सकते हैं।',
				dataCategories: 'डेटा श्रेणियां',
				features: 'विशेषताएं',
				iabVendorsHeading: 'IAB पंजीकृत विक्रेता',
				iabVendorsNotice:
					'ये साझेदार IAB पारदर्शिता और सहमति फ्रेमवर्क (TCF) के साथ पंजीकृत हैं, जो सहमति प्रबंधन के लिए एक उद्योग मानक है।',
				legitimateInterest: 'वैध हित',
				maxAge: 'अधिकतम आयु: {days} दिन',
				nonCookieAccess: 'गैर-कुकी एक्सेस',
				privacyPolicy: 'गोपनीयता नीति',
				purposes: 'उद्देश्य',
				requiredNotice: 'साइट की कार्यक्षमता के लिए आवश्यक, अक्षम नहीं किया जा सकता',
				retention: 'प्रतिधारण: {days} दिन',
				search: 'विक्रेता खोजें...',
				showingCount: '{total} में से {filtered} विक्रेता',
				specialFeatures: 'विशेष विशेषताएं',
				specialPurposes: 'विशेष उद्देश्य',
				storageDisclosure: 'भंडारण प्रकटीकरण',
				usesCookies: 'कुकीज़ का उपयोग करता है',
			},
		},
	},
	legalLinks: {
		cookiePolicy: 'कुकी नीति',
		privacyPolicy: 'गोपनीयता नीति',
		termsOfService: 'सेवा की शर्तें',
	},
};

export default translations;
