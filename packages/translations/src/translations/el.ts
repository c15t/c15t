import type { CompleteTranslations } from '../types';

export const translations: CompleteTranslations = {
	common: {
		acceptAll: 'Αποδοχή όλων',
		close: 'Κλείσιμο',
		customize: 'Προσαρμογή',
		rejectAll: 'Απόρριψη όλων',
		save: 'Αποθήκευση ρυθμίσεων',
		securedBy: 'Προστατεύεται από',
	},
	consentManagerDialog: {
		description:
			'Προσαρμόστε τις ρυθμίσεις απορρήτου σας εδώ. Μπορείτε να επιλέξετε ποιους τύπους cookies και τεχνολογιών παρακολούθησης επιτρέπετε.',
		title: 'Ρυθμίσεις απορρήτου',
	},
	consentTypes: {
		experience: {
			description:
				'Αυτά τα cookies μας βοηθούν να παρέχουμε καλύτερη εμπειρία χρήστη και να δοκιμάζουμε νέες λειτουργίες.',
			title: 'Εμπειρία',
		},
		functionality: {
			description:
				'Αυτά τα cookies επιτρέπουν βελτιωμένη λειτουργικότητα και εξατομίκευση του ιστότοπου.',
			title: 'Λειτουργικότητα',
		},
		marketing: {
			description:
				'Αυτά τα cookies χρησιμοποιούνται για την προβολή σχετικών διαφημίσεων και την παρακολούθηση της αποτελεσματικότητάς τους.',
			title: 'Μάρκετινγκ',
		},
		measurement: {
			description:
				'Αυτά τα cookies μας βοηθούν να κατανοήσουμε πώς αλληλεπιδρούν οι επισκέπτες με τον ιστότοπο και να βελτιώσουμε την απόδοσή του.',
			title: 'Αναλυτικά στοιχεία',
		},
		necessary: {
			description:
				'Αυτά τα cookies είναι απαραίτητα για τη σωστή λειτουργία του ιστότοπου και δεν μπορούν να απενεργοποιηθούν.',
			title: 'Απολύτως απαραίτητα',
		},
	},
	cookieBanner: {
		description:
			'Αυτός ο ιστότοπος χρησιμοποιεί cookies για τη βελτίωση της εμπειρίας περιήγησής σας, την ανάλυση της επισκεψιμότητας του ιστότοπου και την προβολή εξατομικευμένου περιεχομένου.',
		title: 'Εκτιμούμε το απόρρητό σας',
	},
	frame: {
		actionButton: 'Ενεργοποίηση συγκατάθεσης {category}',
		error: 'This content could not be loaded.',
		loading: 'Loading content…',
		policyBlocked:
			"This content is unavailable under your region's consent policy.",
		title:
			'Αποδεχτείτε τη συγκατάθεση {category} για να δείτε αυτό το περιεχόμενο.',
	},
	iab: {
		banner: {
			andMore: 'Και {count} ακόμη...',
			description:
				'Εμείς και οι {partnerCount} συνεργάτες μας αποθηκεύουμε ή/και έχουμε πρόσβαση σε πληροφορίες στη συσκευή σας και επεξεργαζόμαστε προσωπικά δεδομένα, όπως μοναδικά αναγνωριστικά και δεδομένα περιήγησης, για αυτόν τον ιστότοπο, για να:',
			legitimateInterestNotice:
				'Ορισμένοι συνεργάτες επικαλούνται έννομο συμφέρον για την επεξεργασία των δεδομένων σας. Έχετε το δικαίωμα να αντιταχθείτε σε αυτήν την επεξεργασία, να προσαρμόσετε τις επιλογές σας και να ανακαλέσετε τη συγκατάθεσή σας ανά πάσα στιγμή.',
			partnersLink: '{count} συνεργάτες',
			scopeGroup:
				'Η επιλογή σας ισχύει για όλες τις ιστοσελίδες μας σε αυτή την ομάδα.',
			scopeServiceSpecific:
				'Η συγκατάθεσή σας ισχύει μόνο για αυτόν τον ιστότοπο και δεν θα επηρεάσει άλλες υπηρεσίες.',
			title: 'Ρυθμίσεις απορρήτου',
		},
		common: {
			acceptAll: 'Αποδοχή όλων',
			clearSelection: 'Εκκαθάριση',
			customPartner:
				'Προσαρμοσμένος συνεργάτης που δεν είναι εγγεγραμμένος στο IAB',
			customize: 'Προσαρμογή',
			loading: 'Φόρτωση...',
			rejectAll: 'Απόρριψη όλων',
			saveSettings: 'Αποθήκευση ρυθμίσεων',
			showingSelectedVendor: 'Εμφάνιση επιλεγμένου συνεργάτη',
		},
		preferenceCenter: {
			description:
				'Προσαρμόστε τις ρυθμίσεις απορρήτου σας εδώ. Μπορείτε να επιλέξετε ποιους τύπους cookies και τεχνολογιών παρακολούθησης επιτρέπετε.',
			footer: {
				consentStorage:
					'Οι προτιμήσεις συγκατάθεσης αποθηκεύονται σε cookie με το όνομα "euconsent-v2" για 13 μήνες. Η διάρκεια αποθήκευσης ενδέχεται να ανανεωθεί όταν ενημερώνετε τις προτιμήσεις σας.',
			},
			purposeItem: {
				examples: 'Παραδείγματα',
				legitimateInterest: 'Έννομο συμφέρον',
				objectButton: 'Αντίρρηση',
				objected: 'Αντιτάχθηκε',
				partners: '{count} συνεργάτες',
				partnersUsingPurpose: 'Συνεργάτες που χρησιμοποιούν αυτόν τον σκοπό',
				rightToObject:
					'Έχετε το δικαίωμα να αντιταχθείτε στην επεξεργασία που βασίζεται σε έννομο συμφέρον.',
				vendorsUseLegitimateInterest:
					'{count} συνεργάτες επικαλούνται έννομο συμφέρον',
				withYourPermission: 'Με τη συγκατάθεσή σας',
			},
			specialPurposes: {
				title: 'Βασικές λειτουργίες (απαιτούνται)',
				tooltip:
					'Αυτές είναι απαραίτητες για τη λειτουργικότητα και την ασφάλεια του ιστότοπου. Σύμφωνα με το IAB TCF, δεν μπορείτε να αντιταχθείτε σε αυτούς τους ειδικούς σκοπούς.',
			},
			tabs: {
				purposes: 'Σκοποί',
				vendors: 'Συνεργάτες',
			},
			title: 'Ρυθμίσεις απορρήτου',
			vendorList: {
				customVendorsHeading: 'Προσαρμοσμένοι συνεργάτες',
				customVendorsNotice:
					'Αυτοί είναι προσαρμοσμένοι συνεργάτες που δεν είναι εγγεγραμμένοι στο IAB Transparency & Consent Framework (TCF). Επεξεργάζονται δεδομένα με βάση τη συγκατάθεσή σας και ενδέχεται να έχουν διαφορετικές πρακτικές απορρήτου από τους εγγεγραμμένους συνεργάτες του IAB.',
				dataCategories: 'Κατηγορίες δεδομένων',
				features: 'Χαρακτηριστικά',
				iabVendorsHeading: 'Εγγεγραμμένοι συνεργάτες IAB',
				iabVendorsNotice:
					'Αυτοί οι συνεργάτες είναι εγγεγραμμένοι στο IAB Transparency & Consent Framework (TCF), ένα βιομηχανικό πρότυπο για τη διαχείριση της συγκατάθεσης',
				legitimateInterest: 'Έννομο συμφέρον',
				maxAge: 'Μέγιστη διάρκεια: {days} ημ.',
				nonCookieAccess: 'Πρόσβαση χωρίς cookies',
				privacyPolicy: 'Πολιτική απορρήτου',
				purposes: 'Σκοποί',
				requiredNotice:
					'Απαιτείται για τη λειτουργικότητα του ιστότοπου, δεν μπορεί να απενεργοποιηθεί',
				retention: 'Διατήρηση: {days} ημ.',
				search: 'Αναζήτηση συνεργατών...',
				showingCount: '{filtered} από {total} συνεργάτες',
				specialFeatures: 'Ειδικά χαρακτηριστικά',
				specialPurposes: 'Ειδικοί σκοποί',
				storageDisclosure: 'Γνωστοποίηση αποθήκευσης',
				usesCookies: 'Χρησιμοποιεί cookies',
			},
		},
	},
	legalLinks: {
		cookiePolicy: 'Πολιτική cookies',
		privacyPolicy: 'Πολιτική απορρήτου',
		termsOfService: 'Όροι χρήσης',
	},
};
export default translations;
