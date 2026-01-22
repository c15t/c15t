import type { CompleteTranslations } from '../types';
export const translations: CompleteTranslations = {
	common: {
		acceptAll: 'Terima Semua',
		rejectAll: 'Tolak Semua',
		customize: 'Sesuaikan',
		save: 'Simpan Pengaturan',
	},
	cookieBanner: {
		title: 'Kami menghargai privasi Anda',
		description:
			'Situs ini menggunakan cookie untuk meningkatkan pengalaman penelusuran Anda, menganalisis lalu lintas situs, dan menampilkan konten yang dipersonalisasi.',
	},
	consentManagerDialog: {
		title: 'Pengaturan Privasi',
		description:
			'Atur preferensi privasi Anda di sini. Anda dapat memilih jenis cookie dan teknologi pelacakan yang diizinkan.',
	},
	consentTypes: {
		necessary: {
			title: 'Sangat Diperlukan',
			description:
				'Cookie ini penting agar situs web dapat berfungsi dengan baik dan tidak dapat dinonaktifkan.',
		},
		functionality: {
			title: 'Fungsionalitas',
			description:
				'Cookie ini memungkinkan peningkatan fungsionalitas dan personalisasi situs web.',
		},
		marketing: {
			title: 'Pemasaran',
			description:
				'Cookie ini digunakan untuk menampilkan iklan yang relevan dan melacak efektivitasnya.',
		},
		measurement: {
			title: 'Analitik',
			description:
				'Cookie ini membantu kami memahami bagaimana pengunjung berinteraksi dengan situs web dan meningkatkan kinerjanya.',
		},
		experience: {
			title: 'Pengalaman',
			description:
				'Cookie ini membantu kami memberikan pengalaman pengguna yang lebih baik dan menguji fitur baru.',
		},
	},
	frame: {
		title: 'Setujui {category} untuk melihat konten ini.',
		actionButton: 'Aktifkan persetujuan {category}',
	},
	legalLinks: {
		privacyPolicy: 'Kebijakan Privasi',
		cookiePolicy: 'Kebijakan Cookie',
		termsOfService: 'Syarat Layanan',
	},
	iab: {
		banner: {
			title: 'Pengaturan Privasi',
			description:
				'Kami dan {partnerCount} mitra kami menyimpan dan/atau mengakses informasi pada perangkat Anda dan memproses data pribadi, seperti pengidentifikasi unik dan data penelusuran, untuk situs web ini, untuk:',
			partnersLink: '{count} mitra',
			andMore: 'Dan {count} lainnya...',
			legitimateInterestNotice:
				'Beberapa mitra mengklaim kepentingan sah untuk memproses data Anda. Anda memiliki hak untuk menolak pemrosesan ini, menyesuaikan pilihan Anda, dan menarik persetujuan Anda kapan saja.',
		},
		preferenceCenter: {
			title: 'Pengaturan Privasi',
			description:
				'Atur preferensi privasi Anda di sini. Anda dapat memilih jenis cookie dan teknologi pelacakan yang diizinkan.',
			tabs: {
				purposes: 'Tujuan',
				vendors: 'Vendor',
			},
			purposeItem: {
				partners: '{count} mitra',
				vendorsUseLegitimateInterest:
					'{count} vendor mengklaim kepentingan sah',
				examples: 'Contoh',
				partnersUsingPurpose: 'Mitra yang Menggunakan Tujuan Ini',
				withYourPermission: 'Dengan Izin Anda',
				legitimateInterest: 'Kepentingan Sah',
				objectButton: 'Keberatan',
				objected: 'Ditolak',
				rightToObject:
					'Anda memiliki hak untuk menolak pemrosesan berdasarkan kepentingan sah.',
			},
			specialPurposes: {
				title: 'Fungsi Penting (Wajib)',
				tooltip:
					'Ini diperlukan untuk fungsionalitas dan keamanan situs. Per IAB TCF, Anda tidak dapat menolak tujuan khusus ini.',
			},
			vendorList: {
				search: 'Cari vendor...',
				showingCount: '{filtered} dari {total} vendor',
				iabVendorsHeading: 'Vendor Terdaftar IAB',
				iabVendorsNotice:
					'Mitra-mitra ini terdaftar di IAB Transparency & Consent Framework (TCF), standar industri untuk mengelola persetujuan',
				customVendorsHeading: 'Mitra Kustom',
				customVendorsNotice:
					'Ini adalah mitra kustom yang tidak terdaftar di IAB Transparency & Consent Framework (TCF). Mereka memproses data berdasarkan persetujuan Anda dan mungkin memiliki praktik privasi yang berbeda dari vendor terdaftar IAB.',
				purposes: 'Tujuan',
				specialPurposes: 'Tujuan Khusus',
				specialFeatures: 'Fitur Khusus',
				dataCategories: 'Kategori Data',
				usesCookies: 'Menggunakan Cookie',
				nonCookieAccess: 'Akses Non-Cookie',
				maxAge: 'Usia Maks: {days}h',
				legitimateInterest: 'Kepent. Sah',
				privacyPolicy: 'Kebijakan Privasi',
				storageDisclosure: 'Pengungkapan Penyimpanan',
				requiredNotice:
					'Diperlukan untuk fungsionalitas situs, tidak dapat dinonaktifkan',
			},
			footer: {
				consentStorage:
					'Preferensi persetujuan disimpan dalam cookie bernama "euconsent-v2" selama 13 bulan.',
			},
		},
		common: {
			acceptAll: 'Terima Semua',
			rejectAll: 'Tolak Semua',
			customize: 'Sesuaikan',
			saveSettings: 'Simpan Pengaturan',
			loading: 'Memuat...',
			showingSelectedVendor: 'Menampilkan vendor terpilih',
			clearSelection: 'Bersihkan',
			customPartner: 'Mitra kustom tidak terdaftar di IAB',
		},
	},
};
export default translations;
