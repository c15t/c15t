import type { CompleteTranslations } from '../types';

export const translations: CompleteTranslations = {
	common: {
		acceptAll: 'Chấp nhận tất cả',
		acknowledge: 'Đã hiểu',
		close: 'Đóng',
		customize: 'Tùy chỉnh',
		dismiss: 'Bỏ qua',
		rejectAll: 'Từ chối tất cả',
		save: 'Lưu cài đặt',
		securedBy: 'Được bảo mật bởi',
	},
	consentGate: {
		actionButton: 'Đồng ý cho {category}',
		error: 'Không thể tải nội dung này.',
		loading: 'Đang tải nội dung…',
		policyBlocked:
			'Nội dung này không khả dụng theo chính sách về sự đồng ý tại khu vực của bạn.',
		title: 'Vui lòng đồng ý cho {category} để xem nội dung này.',
	},
	consentManagerDialog: {
		description:
			'Tùy chỉnh cài đặt quyền riêng tư của bạn tại đây. Bạn có thể chọn những loại cookie và công nghệ theo dõi mà bạn cho phép.',
		title: 'Cài đặt quyền riêng tư',
		vendors: {
			disabledByCategory: 'Bật danh mục này để chọn nhà cung cấp.',
			privacyPolicy: 'Chính sách quyền riêng tư',
			switchLabel: 'Cho phép {vendor}',
			title: 'Nhà cung cấp ({count})',
		},
	},
	consentTypes: {
		experience: {
			description:
				'Các cookie này giúp chúng tôi mang lại trải nghiệm người dùng tốt hơn và thử nghiệm các tính năng mới.',
			title: 'Trải nghiệm',
		},
		functionality: {
			description:
				'Các cookie này cho phép các chức năng nâng cao và cá nhân hóa trang web.',
			title: 'Chức năng',
		},
		marketing: {
			description:
				'Các cookie này được dùng để hiển thị quảng cáo phù hợp và đo lường hiệu quả của quảng cáo.',
			title: 'Tiếp thị',
		},
		measurement: {
			description:
				'Các cookie này giúp chúng tôi hiểu cách khách truy cập tương tác với trang web và cải thiện hiệu suất của trang.',
			title: 'Phân tích',
		},
		necessary: {
			description:
				'Các cookie này cần thiết để trang web hoạt động bình thường và không thể tắt.',
			title: 'Thiết yếu',
		},
	},
	cookieBanner: {
		description:
			'Trang web này sử dụng cookie để cải thiện trải nghiệm duyệt web, phân tích lưu lượng truy cập và hiển thị nội dung được cá nhân hóa.',
		noticeDescription:
			'Chúng tôi sử dụng cookie và các công nghệ tương tự để vận hành trang web này, đo lường lưu lượng truy cập và cá nhân hóa nội dung cũng như quảng cáo. Bạn có thể từ chối hoặc quản lý tùy chọn của mình bất cứ lúc nào.',
		noticeTitle: 'Thông báo về quyền riêng tư',
		title: 'Chúng tôi tôn trọng quyền riêng tư của bạn',
	},
	iab: {
		banner: {
			andMore: 'Và {count} mục khác...',
			description:
				'Chúng tôi và {partnerCount} đối tác lưu trữ và/hoặc truy cập thông tin trên thiết bị của bạn, đồng thời xử lý dữ liệu cá nhân như mã định danh duy nhất và dữ liệu duyệt web cho trang web này, nhằm:',
			legitimateInterestNotice:
				'Một số đối tác cho rằng họ có lợi ích hợp pháp để xử lý dữ liệu của bạn. Bạn có quyền phản đối việc xử lý này, tùy chỉnh lựa chọn của mình và rút lại sự đồng ý bất cứ lúc nào.',
			partnersLink: '{count} đối tác',
			scopeGroup:
				'Lựa chọn của bạn được áp dụng cho các trang web của chúng tôi trong nhóm này.',
			scopeServiceSpecific:
				'Sự đồng ý của bạn chỉ áp dụng cho trang web này và không ảnh hưởng đến các dịch vụ khác.',
			title: 'Cài đặt quyền riêng tư',
		},
		common: {
			acceptAll: 'Chấp nhận tất cả',
			clearSelection: 'Xóa',
			customPartner: 'Đối tác tùy chỉnh chưa đăng ký với IAB',
			customize: 'Tùy chỉnh',
			loading: 'Đang tải...',
			rejectAll: 'Từ chối tất cả',
			saveSettings: 'Lưu cài đặt',
			showingSelectedVendor: 'Đang hiển thị nhà cung cấp đã chọn',
		},
		preferenceCenter: {
			description:
				'Tùy chỉnh cài đặt quyền riêng tư của bạn tại đây. Bạn có thể chọn những loại cookie và công nghệ theo dõi mà bạn cho phép.',
			features: {
				description:
					'Các phương thức xử lý này chỉ có thể được sử dụng để phục vụ một hoặc nhiều mục đích mà bạn được quyền lựa chọn trong thông báo này.',
				title: 'Tính năng',
			},
			footer: {
				consentStorage:
					'Tùy chọn đồng ý được lưu trong cookie có tên "euconsent-v2" trong 13 tháng. Thời hạn lưu trữ có thể được gia hạn khi bạn cập nhật tùy chọn của mình.',
			},
			purposeItem: {
				examples: 'Ví dụ',
				legitimateInterest: 'Lợi ích hợp pháp',
				objectButton: 'Phản đối',
				objected: 'Đã phản đối',
				partners: '{count} đối tác',
				partnersUsingPurpose: 'Các đối tác sử dụng mục đích này',
				rightToObject:
					'Bạn có quyền phản đối việc xử lý dựa trên lợi ích hợp pháp.',
				vendorsUseLegitimateInterest:
					'{count} nhà cung cấp viện dẫn lợi ích hợp pháp',
				withYourPermission: 'Khi có sự cho phép của bạn',
			},
			specialPurposes: {
				title: 'Chức năng thiết yếu (Bắt buộc)',
				tooltip:
					'Các mục này cần thiết cho chức năng và bảo mật của trang web. Theo IAB TCF, bạn không thể phản đối các mục đích đặc biệt này.',
			},
			tabs: {
				purposes: 'Mục đích',
				vendors: 'Nhà cung cấp',
			},
			title: 'Cài đặt quyền riêng tư',
			vendorList: {
				adTechProvidersHeading: 'Nhà cung cấp công nghệ quảng cáo của Google',
				adTechProvidersNotice:
					'Google hợp tác với các nhà cung cấp công nghệ quảng cáo này ngoài khuôn khổ của IAB. Sự đồng ý của bạn chỉ được chuyển đến một nhà cung cấp khi bạn bật nhà cung cấp đó, đồng thời cho phép lưu trữ trên thiết bị và quảng cáo được cá nhân hóa.',
				customVendorsHeading: 'Đối tác tùy chỉnh',
				customVendorsNotice:
					'Đây là các đối tác tùy chỉnh chưa đăng ký với Khung Minh bạch & Đồng ý của IAB (TCF). Họ xử lý dữ liệu dựa trên sự đồng ý của bạn và có thể áp dụng các thông lệ về quyền riêng tư khác với các nhà cung cấp đã đăng ký với IAB.',
				dataCategories: 'Danh mục dữ liệu',
				features: 'Tính năng',
				iabVendorsHeading: 'Nhà cung cấp đã đăng ký với IAB',
				iabVendorsNotice:
					'Các đối tác này đã đăng ký với Khung Minh bạch & Đồng ý của IAB (TCF), một tiêu chuẩn ngành về quản lý sự đồng ý',
				legitimateInterest: 'Lợi ích hợp pháp',
				maxAge: 'Thời hạn tối đa: {days} ngày',
				maxAgeRefreshes: '(được gia hạn)',
				noVendorsFound:
					'Không tìm thấy nhà cung cấp nào khớp với "{searchTerm}"',
				nonCookieAccess: 'Truy cập không qua cookie',
				partnerCount: '{count} đối tác',
				partnerPlural: 'đối tác',
				partnerSingular: 'đối tác',
				privacyPolicy: 'Chính sách quyền riêng tư',
				purposes: 'Mục đích',
				requiredNotice: 'Cần thiết cho chức năng của trang web, không thể tắt',
				retainedDays: 'Lưu giữ: {days} ngày',
				retention: 'Thời gian lưu giữ: {days} ngày',
				search: 'Tìm kiếm nhà cung cấp...',
				showingCount: '{filtered} trên {total} nhà cung cấp',
				specialFeatures: 'Tính năng đặc biệt',
				specialPurposes: 'Mục đích đặc biệt',
				storageDisclosure: 'Công bố về lưu trữ',
				usesCookies: 'Sử dụng cookie',
			},
		},
	},
	legalLinks: {
		cookiePolicy: 'Chính sách cookie',
		privacyPolicy: 'Chính sách quyền riêng tư',
		termsOfService: 'Điều khoản dịch vụ',
	},
	rights: {
		optOut: 'Không bán hoặc chia sẻ dữ liệu của tôi',
		preferences: 'Quản lý tùy chọn',
	},
};

export default translations;
