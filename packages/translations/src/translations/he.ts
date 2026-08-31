import type { CompleteTranslations } from '../types';

export const translations: CompleteTranslations = {
	common: {
		acceptAll: 'אפשר הכל',
		close: 'סגור',
		customize: 'התאמה אישית',
		rejectAll: 'דחה הכל',
		save: 'שמור הגדרות',
		securedBy: 'מאובטח על ידי',
	},
	consentManagerDialog: {
		description:
			'בחר את הגדרות הפרטיות שלך כאן. באפשרותך לבחור אילו סוגי עוגיות וטכנולוגיות מעקב תרצה לאפשר.',
		title: 'הגדרות פרטיות',
	},
	consentTypes: {
		experience: {
			description:
				'עוגיות אלו מאפשרות חוויית משתמש טובה יותר ובדיקת פונקציונליות חדשה באתר.',
			title: 'חוויית משתמש',
		},
		functionality: {
			description: 'עוגיות אלו מאפשרות פונקציונליות משופרת והתאמה אישית.',
			title: 'פונקציונליות',
		},
		marketing: {
			description: 'עוגיות אלו משמשות להתאמת פרסומות ומעקב אחר יעילותן.',
			title: 'שיווק',
		},
		measurement: {
			description:
				'עוגיות אלו מסייעות להבין איך משתמשים באתר ולשפר את ביצועיו.',
			title: 'ניתוח',
		},
		necessary: {
			description: 'עוגיות אלו דרושות לפעולת האתר ולא ניתן להשבית אותן.',
			title: 'הכרחיות',
		},
	},
	cookieBanner: {
		description:
			'אתר זה משתמש בעוגיות (קוקיז) בכדי לשפר את חוויית השימוש, לנטר את תעבורת האתר ולהציג תוכן מותאם אישית.',
		title: 'פרטיותך חשובה לנו',
	},
	frame: {
		actionButton: 'הפעל {category} רשות',
		error: 'This content could not be loaded.',
		loading: 'Loading content…',
		policyBlocked:
			"This content is unavailable under your region's consent policy.",
		title: 'קבל {category} כדי להציג תוכן זה.',
	},
	iab: {
		banner: {
			andMore: 'ועוד {count}...',
			description:
				'אנחנו ו-{partnerCount} השותפים שלנו מאחסנים ו/או ניגשים למידע במכשיר שלך ומעבדים נתונים אישיים, כגון מזהים ייחודיים ונתוני גלישה, עבור אתר זה, כדי:',
			legitimateInterestNotice:
				'חלק מהשותפים טוענים לאינטרס לגיטימי לעבד את הנתונים שלך. יש לך זכות להתנגד לעיבוד זה, להתאים אישית את הבחירות שלך ולבטל את הסכמתך בכל עת.',
			partnersLink: '{count} שותפים',
			scopeGroup: 'הבחירה שלך חלה על כל האתרים שלנו בקבוצה זו.',
			scopeServiceSpecific:
				'ההסכמה שלך חלה רק על אתר זה ולא תשפיע על שירותים אחרים.',
			title: 'הגדרות פרטיות',
		},
		common: {
			acceptAll: 'אפשר הכל',
			clearSelection: 'נקה',
			customPartner: 'שותף מותאם אישית שאינו רשום ב-IAB',
			customize: 'התאמה אישית',
			loading: 'טוען...',
			rejectAll: 'דחה הכל',
			saveSettings: 'שמור הגדרות',
			showingSelectedVendor: 'מציג שותף נבחר',
		},
		preferenceCenter: {
			description:
				'התאם אישית את הגדרות הפרטיות שלך כאן. באפשרותך לבחור אילו סוגי עוגיות וטכנולוגיות מעקב תרצה לאפשר.',
			footer: {
				consentStorage:
					'העדפות הסכמה נשמרות בעוגייה בשם "euconsent-v2" למשך 13 חודשים. משך השמירה עשוי להתחדש כאשר תעדכן את ההעדפות שלך.',
			},
			purposeItem: {
				examples: 'דוגמאות',
				legitimateInterest: 'אינטרס לגיטימי',
				objectButton: 'התנגד',
				objected: 'התנגדת',
				partners: '{count} שותפים',
				partnersUsingPurpose: 'שותפים המשתמשים במטרה זו',
				rightToObject: 'יש לך זכות להתנגד לעיבוד המבוסס על אינטרס לגיטימי.',
				vendorsUseLegitimateInterest: '{count} ספקים טוענים לאינטרס לגיטימי',
				withYourPermission: 'בהסכמתך',
			},
			specialPurposes: {
				title: 'פונקציות חיוניות (נדרש)',
				tooltip:
					'אלו נדרשות לתפקוד ואבטחת האתר. על פי IAB TCF, אינך יכול להתנגד למטרות מיוחדות אלו.',
			},
			tabs: {
				purposes: 'מטרות',
				vendors: 'ספקים',
			},
			title: 'הגדרות פרטיות',
			vendorList: {
				customVendorsHeading: 'שותפים מותאמים אישית',
				customVendorsNotice:
					'אלו הם שותפים מותאמים אישית שאינם רשומים ב-IAB Transparency & Consent Framework (TCF). הם מעבדים נתונים על בסיס הסכמתך ועשויים להיות להם נהלי פרטיות שונים משותפים הרשומים ב-IAB.',
				dataCategories: 'קטגוריות נתונים',
				features: 'תכונות',
				iabVendorsHeading: 'ספקים רשומים ב-IAB',
				iabVendorsNotice:
					'שותפים אלו רשומים במסגרת השקיפות וההסכמה של IAB (TCF), תקן תעשייתי לניהול הסכמה',
				legitimateInterest: 'אינטרס לגיטימי',
				maxAge: 'תוקף מקסימלי: {days} ימים',
				nonCookieAccess: 'גישה ללא עוגיות',
				privacyPolicy: 'מדיניות פרטיות',
				purposes: 'מטרות',
				requiredNotice: 'נדרש לתפעול האתר, לא ניתן להשבית',
				retention: 'שמירה: {days} ימים',
				search: 'חפש ספקים...',
				showingCount: '{filtered} מתוך {total} ספקים',
				specialFeatures: 'תכונות מיוחדות',
				specialPurposes: 'מטרות מיוחדות',
				storageDisclosure: 'גילוי אחסון',
				usesCookies: 'משתמש בעוגיות',
			},
		},
	},
	legalLinks: {
		cookiePolicy: 'מדיניות עוגיות',
		privacyPolicy: 'מדיניות פרטיות',
		termsOfService: 'תנאי שירות',
	},
};
export default translations;
