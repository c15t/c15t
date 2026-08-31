import type { CompleteTranslations } from '../types';

export const translations: CompleteTranslations = {
	common: {
		acceptAll: 'Terima Semua',
		close: 'Tutup',
		customize: 'Sesuaikan',
		rejectAll: 'Tolak Semua',
		save: 'Simpan Pengaturan',
		securedBy: 'Diamankan oleh',
	},
	consentManagerDialog: {
		description:
			'Atur preferensi privasi Anda di sini. Anda dapat memilih jenis cookie dan teknologi pelacakan yang diizinkan.',
		title: 'Pengaturan Privasi',
	},
	consentTypes: {
		experience: {
			description:
				'Cookie ini membantu kami memberikan pengalaman pengguna yang lebih baik dan menguji fitur baru.',
			title: 'Pengalaman',
		},
		functionality: {
			description:
				'Cookie ini memungkinkan peningkatan fungsionalitas dan personalisasi situs web.',
			title: 'Fungsionalitas',
		},
		marketing: {
			description:
				'Cookie ini digunakan untuk menampilkan iklan yang relevan dan melacak efektivitasnya.',
			title: 'Pemasaran',
		},
		measurement: {
			description:
				'Cookie ini membantu kami memahami bagaimana pengunjung berinteraksi dengan situs web dan meningkatkan kinerjanya.',
			title: 'Analitik',
		},
		necessary: {
			description:
				'Cookie ini penting agar situs web dapat berfungsi dengan baik dan tidak dapat dinonaktifkan.',
			title: 'Sangat Diperlukan',
		},
	},
	cookieBanner: {
		description:
			'Situs ini menggunakan cookie untuk meningkatkan pengalaman penelusuran Anda, menganalisis lalu lintas situs, dan menampilkan konten yang dipersonalisasi.',
		title: 'Kami menghargai privasi Anda',
	},
	frame: {
		actionButton: 'Aktifkan persetujuan {category}',
		error: 'This content could not be loaded.',
		loading: 'Loading content…',
		policyBlocked:
			"This content is unavailable under your region's consent policy.",
		title: 'Setujui {category} untuk melihat konten ini.',
	},
	iab: {
		banner: {
			andMore: 'Dan {count} lainnya...',
			description:
				'Kami dan {partnerCount} mitra kami menyimpan dan/atau mengakses informasi pada perangkat Anda dan memproses data pribadi, seperti pengidentifikasi unik dan data penelusuran, untuk situs web ini, untuk:',
			legitimateInterestNotice:
				'Beberapa mitra mengklaim kepentingan sah untuk memproses data Anda. Anda memiliki hak untuk menolak pemrosesan ini, menyesuaikan pilihan Anda, dan menarik persetujuan Anda kapan saja.',
			partnersLink: '{count} mitra',
			scopeGroup:
				'Pilihan Anda berlaku untuk semua situs web kami dalam grup ini.',
			scopeServiceSpecific:
				'Persetujuan Anda hanya berlaku untuk situs web ini dan tidak memengaruhi layanan lainnya.',
			title: 'Pengaturan Privasi',
		},
		common: {
			acceptAll: 'Terima Semua',
			clearSelection: 'Bersihkan',
			customPartner: 'Mitra kustom tidak terdaftar di IAB',
			customize: 'Sesuaikan',
			loading: 'Memuat...',
			rejectAll: 'Tolak Semua',
			saveSettings: 'Simpan Pengaturan',
			showingSelectedVendor: 'Menampilkan vendor terpilih',
		},
		preferenceCenter: {
			description:
				'Atur preferensi privasi Anda di sini. Anda dapat memilih jenis cookie dan teknologi pelacakan yang diizinkan.',
			footer: {
				consentStorage:
					'Preferensi persetujuan disimpan dalam cookie bernama "euconsent-v2" selama 13 bulan. Masa penyimpanan tersebut dapat dimulai ulang saat Anda memperbarui preferensi Anda.',
			},
			purposeItem: {
				examples: 'Contoh',
				legitimateInterest: 'Kepentingan Sah',
				objectButton: 'Keberatan',
				objected: 'Ditolak',
				partners: '{count} mitra',
				partnersUsingPurpose: 'Mitra yang Menggunakan Tujuan Ini',
				rightToObject:
					'Anda memiliki hak untuk menolak pemrosesan berdasarkan kepentingan sah.',
				vendorsUseLegitimateInterest:
					'{count} vendor mengklaim kepentingan sah',
				withYourPermission: 'Dengan Izin Anda',
			},
			specialPurposes: {
				title: 'Fungsi Penting (Wajib)',
				tooltip:
					'Ini diperlukan untuk fungsionalitas dan keamanan situs. Per IAB TCF, Anda tidak dapat menolak tujuan khusus ini.',
			},
			tabs: {
				purposes: 'Tujuan',
				vendors: 'Vendor',
			},
			title: 'Pengaturan Privasi',
			vendorList: {
				customVendorsHeading: 'Mitra Kustom',
				customVendorsNotice:
					'Ini adalah mitra kustom yang tidak terdaftar di IAB Transparency & Consent Framework (TCF). Mereka memproses data berdasarkan persetujuan Anda dan mungkin memiliki praktik privasi yang berbeda dari vendor terdaftar IAB.',
				dataCategories: 'Kategori Data',
				features: 'Fitur',
				iabVendorsHeading: 'Vendor Terdaftar IAB',
				iabVendorsNotice:
					'Mitra-mitra ini terdaftar di IAB Transparency & Consent Framework (TCF), standar industri untuk mengelola persetujuan',
				legitimateInterest: 'Kepent. Sah',
				maxAge: 'Usia Maks: {days}h',
				nonCookieAccess: 'Akses Non-Cookie',
				privacyPolicy: 'Kebijakan Privasi',
				purposes: 'Tujuan',
				requiredNotice:
					'Diperlukan untuk fungsionalitas situs, tidak dapat dinonaktifkan',
				retention: 'Retensi: {days}h',
				search: 'Cari vendor...',
				showingCount: '{filtered} dari {total} vendor',
				specialFeatures: 'Fitur Khusus',
				specialPurposes: 'Tujuan Khusus',
				storageDisclosure: 'Pengungkapan Penyimpanan',
				usesCookies: 'Menggunakan Cookie',
			},
		},
	},
	legalLinks: {
		cookiePolicy: 'Kebijakan Cookie',
		privacyPolicy: 'Kebijakan Privasi',
		termsOfService: 'Syarat Layanan',
	},
};
export default translations;
