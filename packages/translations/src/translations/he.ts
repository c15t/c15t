import type { CompleteTranslations } from '../types';
export const translations: CompleteTranslations = {
	common: {
		acceptAll: 'אפשר הכל',
		rejectAll: 'דחה הכל',
		customize: 'התאמה אישית',
		save: 'שמור הגדרות',
	},
	cookieBanner: {
		title: 'פרטיותך חשובה לנו',
		description:
			'אתר זה משתמש בעוגיות (קוקיז) בכדי לשפר את חוויית השימוש, לנטר את תעבורת האתר ולהציג תוכן מותאם אישית.',
	},
	consentManagerDialog: {
		title: 'הגדרות פרטיות',
		description:
			'בחר את הגדרות הפרטיות שלך כאן. באפשרותך לבחור אילו סוגי עוגיות וטכנולוגיות מעקב תרצה לאפשר.',
	},
	consentTypes: {
		necessary: {
			title: 'הכרחיות',
			description: 'עוגיות אלו דרושות לפעולת האתר ולא ניתן להשבית אותן.',
		},
		functionality: {
			title: 'פונקציונליות',
			description: 'עוגיות אלו מאפשרות פונקציונליות משופרת והתאמה אישית.',
		},
		marketing: {
			title: 'שיווק',
			description: 'עוגיות אלו משמשות להתאמת פרסומות ומעקב אחר יעילותן.',
		},
		measurement: {
			title: 'ניתוח',
			description:
				'עוגיות אלו מסייעות להבין איך משתמשים באתר ולשפר את ביצועיו.',
		},
		experience: {
			title: 'חוויית משתמש',
			description:
				'עוגיות אלו מאפשרות חוויית משתמש טובה יותר ובדיקת פונקציונליות חדשה באתר.',
		},
	},
	frame: {
		title: 'קבל {category} כדי להציג תוכן זה.',
		actionButton: 'הפעל {category} רשות',
	},
	legalLinks: {
		privacyPolicy: 'מדיניות פרטיות',
		cookiePolicy: 'מדיניות עוגיות',
		termsOfService: 'תנאי שירות',
	},
	iab: {
		banner: {
			title: 'הגדרות פרטיות',
			description:
				'אנחנו ו-{partnerCount} השותפים שלנו מאחסנים ו/או ניגשים למידע במכשיר שלך ומעבדים נתונים אישיים, כגון מזהים ייחודיים ונתוני גלישה, עבור אתר זה, כדי:',
			partnersLink: '{count} שותפים',
			andMore: 'ועוד {count}...',
			legitimateInterestNotice:
				'חלק מהשותפים טוענים לאינטרס לגיטימי לעבד את הנתונים שלך. יש לך זכות להתנגד לעיבוד זה, להתאים אישית את הבחירות שלך ולבטל את הסכמתך בכל עת.',
		},
		preferenceCenter: {
			title: 'הגדרות פרטיות',
			description:
				'התאם אישית את הגדרות הפרטיות שלך כאן. באפשרותך לבחור אילו סוגי עוגיות וטכנולוגיות מעקב תרצה לאפשר.',
			tabs: {
				purposes: 'מטרות',
				vendors: 'ספקים',
			},
			purposeItem: {
				partners: '{count} שותפים',
				vendorsUseLegitimateInterest: '{count} ספקים טוענים לאינטרס לגיטימי',
				examples: 'דוגמאות',
				partnersUsingPurpose: 'שותפים המשתמשים במטרה זו',
				withYourPermission: 'בהסכמתך',
				legitimateInterest: 'אינטרס לגיטימי',
				objectButton: 'התנגד',
				objected: 'התנגדת',
				rightToObject: 'יש לך זכות להתנגד לעיבוד המבוסס על אינטרס לגיטימי.',
			},
			specialPurposes: {
				title: 'פונקציות חיוניות (נדרש)',
				tooltip:
					'אלו נדרשות לתפקוד ואבטחת האתר. על פי IAB TCF, אינך יכול להתנגד למטרות מיוחדות אלו.',
			},
			vendorList: {
				search: 'חפש ספקים...',
				showingCount: '{filtered} מתוך {total} ספקים',
				iabVendorsHeading: 'ספקים רשומים ב-IAB',
				iabVendorsNotice:
					'שותפים אלו רשומים במסגרת השקיפות וההסכמה של IAB (TCF), תקן תעשייתי לניהול הסכמה',
				customVendorsHeading: 'שותפים מותאמים אישית',
				customVendorsNotice:
					'אלו הם שותפים מותאמים אישית שאינם רשומים ב-IAB Transparency & Consent Framework (TCF). הם מעבדים נתונים על בסיס הסכמתך ועשויים להיות להם נהלי פרטיות שונים משותפים הרשומים ב-IAB.',
				purposes: 'מטרות',
				specialPurposes: 'מטרות מיוחדות',
				specialFeatures: 'תכונות מיוחדות',
				dataCategories: 'קטגוריות נתונים',
				usesCookies: 'משתמש בעוגיות',
				nonCookieAccess: 'גישה ללא עוגיות',
				maxAge: 'תוקף מקסימלי: {days} ימים',
				legitimateInterest: 'אינטרס לגיטימי',
				privacyPolicy: 'מדיניות פרטיות',
				storageDisclosure: 'גילוי אחסון',
				requiredNotice: 'נדרש לתפעול האתר, לא ניתן להשבית',
			},
			footer: {
				consentStorage:
					'העדפות הסכמה נשמרות בעוגייה בשם "euconsent-v2" למשך 13 חודשים.',
			},
		},
		common: {
			acceptAll: 'אפשר הכל',
			rejectAll: 'דחה הכל',
			customize: 'התאמה אישית',
			saveSettings: 'שמור הגדרות',
			loading: 'טוען...',
			showingSelectedVendor: 'מציג שותף נבחר',
			clearSelection: 'נקה',
			customPartner: 'שותף מותאם אישית שאינו רשום ב-IAB',
		},
	},
};
export default translations;
