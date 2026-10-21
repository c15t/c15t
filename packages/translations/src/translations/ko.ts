import type { CompleteTranslations } from '../types';

export const translations: CompleteTranslations = {
	common: {
		acceptAll: '모두 허용',
		acknowledge: '확인',
		close: '닫기',
		customize: '맞춤 설정',
		dismiss: '숨기기',
		rejectAll: '모두 거부',
		save: '설정 저장',
		securedBy: '보안 제공:',
	},
	consentGate: {
		actionButton: '{category}에 동의하기',
		error: '이 콘텐츠를 불러올 수 없습니다.',
		loading: '콘텐츠를 불러오는 중…',
		policyBlocked:
			'귀하의 지역에 적용되는 동의 정책에 따라 이 콘텐츠를 이용할 수 없습니다.',
		title: '{category}에 동의하면 이 콘텐츠를 볼 수 있습니다.',
	},
	consentManagerDialog: {
		description:
			'여기에서 개인정보 보호 설정을 변경할 수 있습니다. 허용할 쿠키 및 추적 기술의 유형을 선택해 주십시오.',
		title: '개인정보 보호 설정',
		vendors: {
			disabledByCategory:
				'이 카테고리를 활성화하면 공급업체를 선택할 수 있습니다.',
			privacyPolicy: '개인정보 처리방침',
			switchLabel: '{vendor} 허용',
			title: '공급업체({count})',
		},
	},
	consentTypes: {
		experience: {
			description:
				'이 쿠키는 더 나은 사용자 경험을 제공하고 새로운 기능을 테스트하는 데 사용됩니다.',
			title: '사용자 경험',
		},
		functionality: {
			description:
				'이 쿠키는 웹사이트의 고급 기능과 개인 맞춤 설정을 제공합니다.',
			title: '기능',
		},
		marketing: {
			description:
				'이 쿠키는 관련성 높은 광고를 제공하고 광고 효과를 측정하는 데 사용됩니다.',
			title: '마케팅',
		},
		measurement: {
			description:
				'이 쿠키는 방문자가 웹사이트를 이용하는 방식을 파악하고 웹사이트 성능을 개선하는 데 도움이 됩니다.',
			title: '분석',
		},
		necessary: {
			description:
				'이 쿠키는 웹사이트가 정상적으로 작동하는 데 반드시 필요하며 비활성화할 수 없습니다.',
			title: '필수',
		},
	},
	cookieBanner: {
		description:
			'이 사이트는 브라우징 환경 개선, 사이트 트래픽 분석, 맞춤형 콘텐츠 제공을 위해 쿠키를 사용합니다.',
		noticeDescription:
			'당사는 이 사이트 운영, 트래픽 측정, 콘텐츠 및 광고 맞춤화를 위해 쿠키 및 유사 기술을 사용합니다. 언제든지 선택적 쿠키 및 유사 기술의 사용을 거부하거나 설정을 관리할 수 있습니다.',
		noticeTitle: '개인정보 보호 안내',
		title: '귀하의 개인정보를 소중히 여깁니다',
	},
	iab: {
		banner: {
			andMore: '그 외 {count}개...',
			description:
				'당사와 {partnerCount}개 파트너는 이 웹사이트에서 다음 목적을 위해 귀하의 기기에 정보를 저장하거나 액세스하고, 고유 식별자 및 브라우징 데이터와 같은 개인정보를 처리합니다:',
			legitimateInterestNotice:
				'일부 파트너는 귀하의 데이터 처리에 정당한 이익이 있다고 주장합니다. 귀하는 이러한 처리에 이의를 제기하고, 선택 사항을 변경하며, 언제든지 동의를 철회할 권리가 있습니다.',
			partnersLink: '{count}개 파트너',
			scopeGroup:
				'귀하의 선택은 이 그룹에 속한 당사의 모든 웹사이트에 적용됩니다.',
			scopeServiceSpecific:
				'귀하의 동의는 이 웹사이트에만 적용되며 다른 서비스에는 영향을 주지 않습니다.',
			title: '개인정보 보호 설정',
		},
		common: {
			acceptAll: '모두 허용',
			clearSelection: '지우기',
			customPartner: 'IAB에 등록되지 않은 사용자 지정 파트너',
			customize: '맞춤 설정',
			loading: '불러오는 중...',
			rejectAll: '모두 거부',
			saveSettings: '설정 저장',
			showingSelectedVendor: '선택한 공급업체 표시 중',
		},
		preferenceCenter: {
			description:
				'여기에서 개인정보 보호 설정을 변경할 수 있습니다. 허용할 쿠키 및 추적 기술의 유형을 선택해 주십시오.',
			features: {
				description:
					'이러한 처리 방식은 이 고지에서 귀하에게 선택권이 주어진 하나 이상의 목적을 달성하기 위해서만 사용될 수 있습니다.',
				title: '기능',
			},
			footer: {
				consentStorage:
					'동의 설정은 "euconsent-v2"라는 이름의 쿠키에 13개월 동안 저장됩니다. 설정을 변경하면 저장 기간이 갱신될 수 있습니다.',
			},
			purposeItem: {
				examples: '예시',
				legitimateInterest: '정당한 이익',
				objectButton: '이의 제기',
				objected: '이의 제기됨',
				partners: '{count}개 파트너',
				partnersUsingPurpose: '이 목적을 사용하는 파트너',
				rightToObject:
					'귀하는 정당한 이익에 근거한 처리에 이의를 제기할 권리가 있습니다.',
				vendorsUseLegitimateInterest:
					'정당한 이익을 주장하는 공급업체 {count}개',
				withYourPermission: '귀하의 동의에 따라',
			},
			specialPurposes: {
				title: '필수 기능(해제 불가)',
				tooltip:
					'사이트 기능과 보안에 필요한 항목입니다. IAB TCF에 따라 이러한 특별 목적에는 이의를 제기할 수 없습니다.',
			},
			tabs: {
				purposes: '목적',
				vendors: '공급업체',
			},
			title: '개인정보 보호 설정',
			vendorList: {
				adTechProvidersHeading: 'Google 광고 기술 제공업체',
				adTechProvidersNotice:
					'Google은 IAB 프레임워크와 별도로 이러한 광고 기술 제공업체와 협력합니다. 귀하가 해당 제공업체를 켜고 기기 저장소 사용과 맞춤형 광고도 허용한 경우에만 귀하의 동의가 해당 제공업체에 전달됩니다.',
				customVendorsHeading: '사용자 지정 파트너',
				customVendorsNotice:
					'IAB 투명성 및 동의 프레임워크(TCF)에 등록되지 않은 사용자 지정 파트너입니다. 이들은 귀하의 동의에 따라 데이터를 처리하며, IAB에 등록된 공급업체와 개인정보 처리 관행이 다를 수 있습니다.',
				dataCategories: '데이터 카테고리',
				features: '기능',
				iabVendorsHeading: 'IAB 등록 공급업체',
				iabVendorsNotice:
					'이 파트너는 동의 관리를 위한 업계 표준인 IAB 투명성 및 동의 프레임워크(TCF)에 등록되어 있습니다',
				legitimateInterest: '정당한 이익',
				maxAge: '최대 유효 기간: {days}일',
				maxAgeRefreshes: '(갱신됨)',
				noVendorsFound: '"{searchTerm}"에 해당하는 공급업체가 없습니다',
				nonCookieAccess: '쿠키 외 액세스',
				partnerCount: '{count}개 파트너',
				partnerPlural: '파트너',
				partnerSingular: '파트너',
				privacyPolicy: '개인정보 처리방침',
				purposes: '목적',
				requiredNotice: '사이트 기능에 필수적이므로 비활성화할 수 없습니다',
				retainedDays: '{days}일 보관',
				retention: '보존 기간: {days}일',
				search: '공급업체 검색...',
				showingCount: '공급업체 {total}개 중 {filtered}개',
				specialFeatures: '특별 기능',
				specialPurposes: '특별 목적',
				storageDisclosure: '정보 저장에 관한 안내',
				usesCookies: '쿠키 사용',
			},
		},
	},
	legalLinks: {
		cookiePolicy: '쿠키 정책',
		privacyPolicy: '개인정보 처리방침',
		termsOfService: '서비스 이용약관',
	},
	rights: {
		optOut: '내 개인정보 판매 및 공유 거부',
		preferences: '설정 관리',
	},
};

export default translations;
