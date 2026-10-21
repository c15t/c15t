import type { CompleteTranslations } from '../types';

export const translations: CompleteTranslations = {
	common: {
		acceptAll: 'قبول الكل',
		acknowledge: 'حسنًا',
		close: 'إغلاق',
		customize: 'تخصيص',
		dismiss: 'تجاهل',
		rejectAll: 'رفض الكل',
		save: 'حفظ الإعدادات',
		securedBy: 'محمي بواسطة',
	},
	consentGate: {
		actionButton: 'تفعيل الموافقة على {category}',
		error: 'تعذّر تحميل هذا المحتوى.',
		loading: 'جارٍ تحميل المحتوى…',
		policyBlocked:
			'هذا المحتوى غير متاح بموجب سياسة الموافقة المعمول بها في منطقتك.',
		title: 'يتطلب عرض هذا المحتوى الموافقة على {category}.',
	},
	consentManagerDialog: {
		description:
			'يمكنك تخصيص إعدادات الخصوصية من هنا، واختيار أنواع ملفات تعريف الارتباط وتقنيات التتبع التي تسمح بها.',
		title: 'إعدادات الخصوصية',
		vendors: {
			disabledByCategory: 'يلزم تفعيل هذه الفئة لاختيار المورّدين.',
			privacyPolicy: 'سياسة الخصوصية',
			switchLabel: 'السماح لـ {vendor}',
			title: 'المورّدون ({count})',
		},
	},
	consentTypes: {
		experience: {
			description:
				'تساعدنا ملفات تعريف الارتباط هذه على تقديم تجربة استخدام أفضل واختبار الميزات الجديدة.',
			title: 'التجربة',
		},
		functionality: {
			description:
				'تتيح ملفات تعريف الارتباط هذه وظائف محسّنة وتخصيص الموقع الإلكتروني.',
			title: 'الوظائف',
		},
		marketing: {
			description:
				'تُستخدم ملفات تعريف الارتباط هذه لعرض إعلانات ذات صلة وقياس فعاليتها.',
			title: 'التسويق',
		},
		measurement: {
			description:
				'تساعدنا ملفات تعريف الارتباط هذه على فهم كيفية تفاعل الزوار مع الموقع الإلكتروني وتحسين أدائه.',
			title: 'التحليلات',
		},
		necessary: {
			description:
				'ملفات تعريف الارتباط هذه ضرورية لعمل الموقع الإلكتروني بشكل سليم، ولا يمكن تعطيلها.',
			title: 'ضرورية للغاية',
		},
	},
	cookieBanner: {
		description:
			'يستخدم هذا الموقع ملفات تعريف الارتباط لتحسين تجربة التصفح، وتحليل حركة المرور على الموقع، وعرض محتوى مخصّص.',
		noticeDescription:
			'نستخدم ملفات تعريف الارتباط وتقنيات مشابهة لتشغيل هذا الموقع، وقياس حركة المرور، وتخصيص المحتوى والإعلانات. يمكنك الرفض أو إدارة تفضيلاتك في أي وقت.',
		noticeTitle: 'إشعار الخصوصية',
		title: 'نحن نحترم خصوصيتك',
	},
	iab: {
		banner: {
			andMore: 'و{count} أخرى...',
			description:
				'نقوم نحن و{partnerCount} من الشركاء الذين نتعامل معهم بتخزين المعلومات على جهازك و/أو الوصول إليها، ومعالجة البيانات الشخصية، مثل المعرّفات الفريدة وبيانات التصفح، لهذا الموقع الإلكتروني من أجل:',
			legitimateInterestNotice:
				'يستند بعض الشركاء إلى المصلحة المشروعة لمعالجة بياناتك. ويحق لك الاعتراض على هذه المعالجة، وتخصيص خياراتك، وسحب موافقتك في أي وقت.',
			partnersLink: '{count} من الشركاء',
			scopeGroup: 'ينطبق اختيارك على جميع مواقعنا الإلكترونية ضمن هذه المجموعة.',
			scopeServiceSpecific:
				'تنطبق موافقتك على هذا الموقع الإلكتروني فقط، ولن تؤثر في الخدمات الأخرى.',
			title: 'إعدادات الخصوصية',
		},
		common: {
			acceptAll: 'قبول الكل',
			clearSelection: 'مسح',
			customPartner: 'شريك مخصّص غير مسجّل لدى IAB',
			customize: 'تخصيص',
			loading: 'جارٍ التحميل...',
			rejectAll: 'رفض الكل',
			saveSettings: 'حفظ الإعدادات',
			showingSelectedVendor: 'عرض المورّد المحدد',
		},
		preferenceCenter: {
			description:
				'يمكنك تخصيص إعدادات الخصوصية من هنا، واختيار أنواع ملفات تعريف الارتباط وتقنيات التتبع التي تسمح بها.',
			features: {
				description:
					'لا يجوز استخدام وسائل المعالجة هذه إلا لتحقيق غرض واحد أو أكثر من الأغراض التي يُتاح لك الاختيار بشأنها في هذا الإشعار.',
				title: 'الميزات',
			},
			footer: {
				consentStorage:
					'تُخزَّن تفضيلات الموافقة في ملف تعريف ارتباط باسم "euconsent-v2" لمدة 13 شهرًا. وقد تتجدد مدة التخزين عند تحديث تفضيلاتك.',
			},
			purposeItem: {
				examples: 'أمثلة',
				legitimateInterest: 'المصلحة المشروعة',
				objectButton: 'اعتراض',
				objected: 'تم الاعتراض',
				partners: 'الشركاء: {count}',
				partnersUsingPurpose: 'الشركاء الذين يستخدمون هذا الغرض',
				rightToObject:
					'يحق لك الاعتراض على المعالجة القائمة على المصلحة المشروعة.',
				vendorsUseLegitimateInterest:
					'المورّدون الذين يستندون إلى المصلحة المشروعة: {count}',
				withYourPermission: 'بموافقتك',
			},
			specialPurposes: {
				title: 'الوظائف الأساسية (مطلوبة)',
				tooltip:
					'هذه الوظائف مطلوبة لتشغيل الموقع وأمانه. ووفقًا لإطار IAB TCF، لا يمكن الاعتراض على هذه الأغراض الخاصة.',
			},
			tabs: {
				purposes: 'الأغراض',
				vendors: 'المورّدون',
			},
			title: 'إعدادات الخصوصية',
			vendorList: {
				adTechProvidersHeading: 'مزوّدو تقنيات الإعلان لدى Google',
				adTechProvidersNotice:
					'تتعامل Google مع مزوّدي تقنيات الإعلان هؤلاء خارج إطار IAB. ولا تصل موافقتك إلى أي مزوّد إلا إذا فعّلته وسمحت أيضًا بالتخزين على الجهاز والإعلانات المخصّصة.',
				customVendorsHeading: 'الشركاء المخصّصون',
				customVendorsNotice:
					'هؤلاء شركاء مخصّصون غير مسجّلين في إطار الشفافية والموافقة (TCF) التابع لـ IAB. وهم يعالجون البيانات بناءً على موافقتك، وقد تختلف ممارساتهم المتعلقة بالخصوصية عن ممارسات المورّدين المسجّلين لدى IAB.',
				dataCategories: 'فئات البيانات',
				features: 'الميزات',
				iabVendorsHeading: 'المورّدون المسجّلون لدى IAB',
				iabVendorsNotice:
					'هؤلاء الشركاء مسجّلون في إطار الشفافية والموافقة (TCF) التابع لـ IAB، وهو معيار معتمد في القطاع لإدارة الموافقة',
				legitimateInterest: 'مصلحة مشروعة',
				maxAge: 'المدة القصوى (بالأيام): {days}',
				maxAgeRefreshes: '(تتجدد)',
				noVendorsFound: 'لا يوجد مورّدون يطابقون "{searchTerm}"',
				nonCookieAccess: 'وصول لا يعتمد على ملفات تعريف الارتباط',
				partnerCount: 'الشركاء: {count}',
				partnerPlural: 'شركاء',
				partnerSingular: 'شريك',
				privacyPolicy: 'سياسة الخصوصية',
				purposes: 'الأغراض',
				requiredNotice: 'مطلوب لتشغيل الموقع، ولا يمكن تعطيله',
				retainedDays: 'مدة الاحتفاظ (بالأيام): {days}',
				retention: 'مدة الاحتفاظ (بالأيام): {days}',
				search: 'البحث عن المورّدين...',
				showingCount: 'المورّدون المعروضون: {filtered} من {total}',
				specialFeatures: 'الميزات الخاصة',
				specialPurposes: 'الأغراض الخاصة',
				storageDisclosure: 'الإفصاح عن التخزين',
				usesCookies: 'يستخدم ملفات تعريف الارتباط',
			},
		},
	},
	legalLinks: {
		cookiePolicy: 'سياسة ملفات تعريف الارتباط',
		privacyPolicy: 'سياسة الخصوصية',
		termsOfService: 'شروط الخدمة',
	},
	rights: {
		optOut: 'عدم بيع بياناتي أو مشاركتها',
		preferences: 'إدارة التفضيلات',
	},
};

export default translations;
