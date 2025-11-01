'use client';

import type { PrivacyConsentState } from 'c15t';
import {
	AlertCircle,
	Download,
	Eye,
	RefreshCw,
	RotateCcw,
	ToggleLeft,
	Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { Alert } from '~/components/ui/alert';
import { Button } from '~/components/ui/button';
import { getStore } from '../../dev-tool';
import styles from './quick-actions.module.css';

const STORAGE_KEY = 'privacy-consent-storage';

interface ActionButtonProps {
	icon: React.ReactNode;
	label: string;
	description: string;
	onClick: () => void;
	variant?:
		| 'default'
		| 'destructive'
		| 'outline'
		| 'secondary'
		| 'ghost'
		| 'link';
	disabled?: boolean;
}

function ActionButton({
	icon,
	label,
	description,
	onClick,
	variant = 'default',
	disabled = false,
}: ActionButtonProps) {
	return (
		<div className={styles.preferenceSection}>
			<div className={styles.preferenceHeader}>
				<div className={styles.preferenceLabel}>{label}</div>
				<p className={styles.preferenceDescription}>{description}</p>
			</div>
			<div className={styles.preferenceControl}>
				<Button
					onClick={onClick}
					variant={variant}
					size="sm"
					disabled={disabled}
					className={styles.actionButton}
				>
					{icon}
				</Button>
			</div>
		</div>
	);
}

interface ActionSelectProps {
	label: string;
	description: string;
	value: string;
	options: Array<{ value: string; label: string }>;
	onChange: (value: string) => void;
}

function ActionSelect({
	label,
	description,
	value,
	options,
	onChange,
}: ActionSelectProps) {
	const selectId = `select-${label.toLowerCase().replace(/\s+/g, '-')}`;

	return (
		<div className={styles.preferenceSection}>
			<div className={styles.preferenceHeader}>
				<label htmlFor={selectId} className={styles.preferenceLabel}>
					{label}
				</label>
				<p className={styles.preferenceDescription}>{description}</p>
			</div>
			<div className={styles.preferenceControl}>
				<select
					id={selectId}
					value={value}
					onChange={(e) => onChange(e.target.value)}
					className={styles.actionSelect}
				>
					{options.map((option) => (
						<option key={option.value} value={option.value}>
							{option.label}
						</option>
					))}
				</select>
			</div>
		</div>
	);
}

export function QuickActions() {
	const state = getStore() as PrivacyConsentState;
	const [notification, setNotification] = useState<{
		type: 'success' | 'error';
		message: string;
	} | null>(null);

	const currentCountry = state.locationInfo?.countryCode || 'GB';
	const currentLanguage = state.translationConfig.defaultLanguage || 'en';

	const showNotification = (
		type: 'success' | 'error',
		message: string
	): void => {
		setNotification({ type, message });
		setTimeout(() => {
			setNotification(null);
		}, 3000);
	};

	const handleResetConsents = (): void => {
		try {
			state.resetConsents();
			showNotification('success', 'Consents reset to default values');
		} catch {
			showNotification('error', 'Failed to reset consents');
		}
	};

	const handleClearLocalStorage = (): void => {
		try {
			if (typeof window !== 'undefined') {
				localStorage.removeItem(STORAGE_KEY);
				showNotification('success', 'LocalStorage cleared successfully');
			}
		} catch {
			showNotification('error', 'Failed to clear localStorage');
		}
	};

	const handleToggleAllConsents = (): void => {
		try {
			// Check if all consents are currently enabled
			const allEnabled = Object.values(state.consents).every(
				(value) => value === true
			);

			// Toggle all consents to opposite state
			const newValue = !allEnabled;

			// Update all consent types
			for (const consentName of Object.keys(state.consents)) {
				state.setConsent(consentName as keyof typeof state.consents, newValue);
			}

			showNotification(
				'success',
				`All consents ${newValue ? 'enabled' : 'disabled'}`
			);
		} catch {
			showNotification('error', 'Failed to toggle consents');
		}
	};

	// Country options for dropdown
	const countryOptions = [
		{ value: 'GB', label: '🇬🇧 UK (GDPR)' },
		{ value: 'US', label: '🇺🇸 USA (No banner)' },
		{ value: 'DE', label: '🇩🇪 Germany (GDPR)' },
		{ value: 'FR', label: '🇫🇷 France (GDPR)' },
		{ value: 'CH', label: '🇨🇭 Switzerland' },
		{ value: 'BR', label: '🇧🇷 Brazil (LGPD)' },
		{ value: 'CA', label: '🇨🇦 Canada (PIPEDA)' },
		{ value: 'AU', label: '🇦🇺 Australia' },
		{ value: 'JP', label: '🇯🇵 Japan (APPI)' },
		{ value: 'KR', label: '🇰🇷 South Korea (PIPA)' },
		{ value: 'MX', label: '🇲🇽 Mexico (No banner)' },
		{ value: 'IN', label: '🇮🇳 India (No banner)' },
	];

	// Language options for dropdown
	const languageOptions = [
		{ value: 'en', label: '🇬🇧 English' },
		{ value: 'de', label: '🇩🇪 Deutsch' },
		{ value: 'es', label: '🇪🇸 Español' },
		{ value: 'fr', label: '🇫🇷 Français' },
		{ value: 'it', label: '🇮🇹 Italiano' },
		{ value: 'pt', label: '🇵🇹 Português' },
		{ value: 'nl', label: '🇳🇱 Nederlands' },
		{ value: 'zh', label: '🇨🇳 中文' },
		{ value: 'fi', label: '🇫🇮 Suomi' },
		{ value: 'id', label: '🇮🇩 Indonesia' },
		{ value: 'he', label: '🇮🇱 עברית' },
	];

	const handleSimulateCountry = (countryCode: string): void => {
		try {
			// Define realistic country test cases with banner visibility
			const countries: Record<
				string,
				{
					name: string;
					countryCode: string;
					regionCode: string | null;
					jurisdiction:
						| 'GDPR'
						| 'CH'
						| 'BR'
						| 'PIPEDA'
						| 'AU'
						| 'APPI'
						| 'PIPA'
						| 'NONE';
					jurisdictionMessage: string;
					showBanner: boolean;
				}
			> = {
				GB: {
					name: 'UK',
					countryCode: 'GB',
					regionCode: 'ENG',
					jurisdiction: 'GDPR' as const,
					jurisdictionMessage:
						'GDPR or equivalent regulations require a cookie banner.',
					showBanner: true,
				},
				US: {
					name: 'USA (Non-CA)',
					countryCode: 'US',
					regionCode: 'NY',
					jurisdiction: 'NONE' as const,
					jurisdictionMessage: 'No banner required.',
					showBanner: false,
				},
				DE: {
					name: 'Germany',
					countryCode: 'DE',
					regionCode: null,
					jurisdiction: 'GDPR' as const,
					jurisdictionMessage:
						'GDPR or equivalent regulations require a cookie banner.',
					showBanner: true,
				},
				FR: {
					name: 'France',
					countryCode: 'FR',
					regionCode: null,
					jurisdiction: 'GDPR' as const,
					jurisdictionMessage:
						'GDPR or equivalent regulations require a cookie banner.',
					showBanner: true,
				},
				CH: {
					name: 'Switzerland',
					countryCode: 'CH',
					regionCode: null,
					jurisdiction: 'CH' as const,
					jurisdictionMessage:
						'Swiss data protection laws require a cookie banner.',
					showBanner: true,
				},
				BR: {
					name: 'Brazil',
					countryCode: 'BR',
					regionCode: 'SP',
					jurisdiction: 'BR' as const,
					jurisdictionMessage: 'LGPD regulations require a cookie banner.',
					showBanner: true,
				},
				CA: {
					name: 'Canada',
					countryCode: 'CA',
					regionCode: 'ON',
					jurisdiction: 'PIPEDA' as const,
					jurisdictionMessage: 'PIPEDA regulations require a cookie banner.',
					showBanner: true,
				},
				AU: {
					name: 'Australia',
					countryCode: 'AU',
					regionCode: null,
					jurisdiction: 'AU' as const,
					jurisdictionMessage:
						'Australian Privacy Act requires a cookie banner.',
					showBanner: true,
				},
				JP: {
					name: 'Japan',
					countryCode: 'JP',
					regionCode: null,
					jurisdiction: 'APPI' as const,
					jurisdictionMessage: 'APPI regulations require a cookie banner.',
					showBanner: true,
				},
				KR: {
					name: 'South Korea',
					countryCode: 'KR',
					regionCode: null,
					jurisdiction: 'PIPA' as const,
					jurisdictionMessage: 'PIPA regulations require a cookie banner.',
					showBanner: true,
				},
				MX: {
					name: 'Mexico',
					countryCode: 'MX',
					regionCode: null,
					jurisdiction: 'NONE' as const,
					jurisdictionMessage: 'No banner required.',
					showBanner: false,
				},
				IN: {
					name: 'India',
					countryCode: 'IN',
					regionCode: null,
					jurisdiction: 'NONE' as const,
					jurisdictionMessage: 'No banner required.',
					showBanner: false,
				},
			};

			const country = countries[countryCode];
			if (!country) {
				showNotification('error', 'Invalid country selected');
				return;
			}

			// Update location info
			state.setLocationInfo({
				countryCode: country.countryCode,
				regionCode: country.regionCode,
				jurisdiction: country.jurisdiction,
				jurisdictionMessage: country.jurisdictionMessage,
			});

			// Also update showPopup based on whether banner should show
			if (country.showBanner) {
				state.setShowPopup(true, true);
			}

			const bannerStatus = country.showBanner
				? 'Banner shown'
				: 'Banner hidden';
			showNotification('success', `${country.name} - ${bannerStatus}`);
		} catch {
			showNotification('error', 'Failed to simulate country');
		}
	};

	const handleSimulateLanguage = (languageCode: string): void => {
		try {
			// Update translation config with the new language
			state.setTranslationConfig({
				...state.translationConfig,
				defaultLanguage: languageCode,
				disableAutoLanguageSwitch: true,
			});

			const languageName =
				languageOptions.find((l) => l.value === languageCode)?.label ||
				languageCode;
			showNotification('success', `Language: ${languageName}`);
		} catch {
			showNotification('error', 'Failed to simulate language');
		}
	};

	const handleReloadScripts = (): void => {
		try {
			const result = state.updateScripts();
			showNotification(
				'success',
				`Scripts updated: ${result.loaded.length} loaded, ${result.unloaded.length} unloaded`
			);
		} catch {
			showNotification('error', 'Failed to reload scripts');
		}
	};

	const handleShowPopup = (): void => {
		try {
			state.setShowPopup(true, true);
			showNotification('success', 'Consent popup triggered');
		} catch {
			showNotification('error', 'Failed to show popup');
		}
	};

	const handleExportState = (): void => {
		try {
			// Create a sanitized copy of the state without functions
			const exportData = {
				config: state.config,
				consents: state.consents,
				selectedConsents: state.selectedConsents,
				consentInfo: state.consentInfo,
				locationInfo: state.locationInfo,
				jurisdictionInfo: state.jurisdictionInfo,
				complianceSettings: state.complianceSettings,
				gdprTypes: state.gdprTypes,
				showPopup: state.showPopup,
				isPrivacyDialogOpen: state.isPrivacyDialogOpen,
				hasFetchedBanner: state.hasFetchedBanner,
				isLoadingConsentInfo: state.isLoadingConsentInfo,
				privacySettings: state.privacySettings,
				ignoreGeoLocation: state.ignoreGeoLocation,
				translationConfig: state.translationConfig,
				scripts: state.scripts.map((script) => ({
					id: script.id,
					src: script.src,
					category: script.category,
					alwaysLoad: script.alwaysLoad,
					callbackOnly: script.callbackOnly,
				})),
				loadedScripts: state.loadedScripts,
				timestamp: new Date().toISOString(),
			};

			// Create and download JSON file
			const blob = new Blob([JSON.stringify(exportData, null, 2)], {
				type: 'application/json',
			});
			const url = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			link.download = `c15t-state-${Date.now()}.json`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(url);

			showNotification('success', 'State exported successfully');
		} catch {
			showNotification('error', 'Failed to export state');
		}
	};

	return (
		<>
			{notification && (
				<Alert
					variant={notification.type === 'error' ? 'destructive' : 'default'}
					className={styles.notification}
				>
					<AlertCircle size={16} />
					<span>{notification.message}</span>
				</Alert>
			)}

			<div className={styles.container}>
				<h2 className={styles.sectionTitle}>Consent Management</h2>
				<div className={styles.preferencesContainer}>
					<ActionButton
						icon={<RotateCcw size={16} />}
						label="Reset Consents"
						description="Reset all consent preferences to default values"
						onClick={handleResetConsents}
						variant="outline"
					/>
					<ActionButton
						icon={<ToggleLeft size={16} />}
						label="Toggle All Consents"
						description="Enable or disable all consent categories at once"
						onClick={handleToggleAllConsents}
						variant="outline"
					/>
				</div>

				<h2 className={styles.sectionTitle}>Storage & State</h2>
				<div className={styles.preferencesContainer}>
					<ActionButton
						icon={<Trash2 size={16} />}
						label="Clear LocalStorage"
						description="Remove stored consent data from browser"
						onClick={handleClearLocalStorage}
						variant="outline"
					/>
					<ActionButton
						icon={<Download size={16} />}
						label="Export State"
						description="Download current state as JSON file"
						onClick={handleExportState}
						variant="outline"
					/>
				</div>

				<h2 className={styles.sectionTitle}>Testing & Debugging</h2>
				<div className={styles.preferencesContainer}>
					<ActionSelect
						label="Simulate Country"
						description="Test different countries and banner visibility"
						value={currentCountry}
						options={countryOptions}
						onChange={handleSimulateCountry}
					/>
					<ActionSelect
						label="Switch Language"
						description="Cycle through available translations (i18n)"
						value={currentLanguage}
						options={languageOptions}
						onChange={handleSimulateLanguage}
					/>
					<ActionButton
						icon={<RefreshCw size={16} />}
						label="Reload Scripts"
						description="Force update of all consent-based scripts"
						onClick={handleReloadScripts}
						variant="outline"
					/>
					<ActionButton
						icon={<Eye size={16} />}
						label="Show Popup"
						description="Manually trigger the consent banner"
						onClick={handleShowPopup}
						variant="outline"
					/>
				</div>
			</div>
		</>
	);
}
