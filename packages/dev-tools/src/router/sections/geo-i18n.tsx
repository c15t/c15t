'use client';

import type { PrivacyConsentState } from 'c15t';
import { motion } from 'motion/react';
import { useState } from 'react';
import { Icon, type IconName } from '~/components/icons';
import { Alert } from '~/components/ui/alert';
import { ScrollArea } from '~/components/ui/scroll-area';
import * as Select from '~/components/ui/select';
import quickActionsStyles from '../../components/actions/quick-actions.module.css';
import styles from '../router.module.css';

interface GeoI18nProps {
	state: PrivacyConsentState;
}

export function GeoI18n({ state }: GeoI18nProps) {
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

	// Country options for dropdown
	const countryOptions = [
		{ value: 'GB', label: 'UK (GDPR)', flag: 'GB' as IconName },
		{ value: 'US', label: 'USA (No banner)', flag: 'US' as IconName },
		{ value: 'DE', label: 'Germany (GDPR)', flag: 'DE' as IconName },
		{ value: 'FR', label: 'France (GDPR)', flag: 'FR' as IconName },
		{ value: 'CH', label: 'Switzerland', flag: 'CH' as IconName },
		{ value: 'BR', label: 'Brazil (LGPD)', flag: 'BR' as IconName },
		{ value: 'CA', label: 'Canada (PIPEDA)', flag: 'CA' as IconName },
		{ value: 'AU', label: 'Australia', flag: 'AU' as IconName },
		{ value: 'JP', label: 'Japan (APPI)', flag: 'JP' as IconName },
		{ value: 'KR', label: 'South Korea (PIPA)', flag: 'KR' as IconName },
		{ value: 'MX', label: 'Mexico (No banner)', flag: 'MX' as IconName },
		{ value: 'IN', label: 'India (No banner)', flag: 'IN' as IconName },
	];

	// Language options for dropdown
	const languageOptions = [
		{ value: 'en', label: 'English', flag: 'GB' as IconName },
		{ value: 'de', label: 'Deutsch', flag: 'DE' as IconName },
		{ value: 'es', label: 'Español', flag: 'ES' as IconName },
		{ value: 'fr', label: 'Français', flag: 'FR' as IconName },
		{ value: 'it', label: 'Italiano', flag: 'IT' as IconName },
		{ value: 'pt', label: 'Português', flag: 'PT' as IconName },
		{ value: 'nl', label: 'Nederlands', flag: 'NL' as IconName },
		{ value: 'zh', label: '中文', flag: 'CN' as IconName },
		{ value: 'fi', label: 'Suomi', flag: 'FI' as IconName },
		{ value: 'id', label: 'Indonesia', flag: 'ID' as IconName },
		{ value: 'he', label: 'עברית', flag: 'IL' as IconName },
	];

	const handleSimulateCountry = (countryCode: string): void => {
		try {
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

			state.setOverrides?.({
				country: countryCode,
			});
			state.fetchConsentBannerInfo();

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
			state.setOverrides?.({
				language: languageCode,
			});
			state.fetchConsentBannerInfo();
			showNotification('success', `Language: ${languageCode}`);
		} catch {
			showNotification('error', 'Failed to simulate language');
		}
	};

	const selectedCountryOption = countryOptions.find(
		(opt) => opt.value === currentCountry
	);
	const selectedLanguageOption = languageOptions.find(
		(opt) => opt.value === currentLanguage
	);

	return (
		<ScrollArea className={styles.scrollContainer}>
			<motion.div
				className={styles.contentContainer}
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				exit={{ opacity: 0 }}
			>
				{notification && (
					<Alert
						variant={notification.type === 'error' ? 'destructive' : 'default'}
						className={styles.notification}
					>
						<Icon name="alert" size={16} />
						<span>{notification.message}</span>
					</Alert>
				)}

				<div className={quickActionsStyles.preferenceSection}>
					<div className={quickActionsStyles.preferenceHeader}>
						<div className={quickActionsStyles.preferenceLabel}>
							Simulate Country
						</div>
						<p className={quickActionsStyles.preferenceDescription}>
							Test different countries and banner visibility
						</p>
					</div>
					<div className={quickActionsStyles.preferenceControl}>
						<Select.Root
							value={currentCountry}
							onValueChange={handleSimulateCountry}
							size="small"
						>
							<Select.Trigger className={quickActionsStyles.actionSelect}>
								{selectedCountryOption?.flag && (
									<Select.TriggerIcon flag={selectedCountryOption.flag} />
								)}
								<Select.Value
									placeholder={selectedCountryOption?.label || 'Select...'}
								/>
							</Select.Trigger>
							<Select.Content>
								{countryOptions.map((option) => (
									<Select.Item key={option.value} value={option.value}>
										{option.flag && <Select.ItemIcon flag={option.flag} />}
										<span>{option.label}</span>
									</Select.Item>
								))}
							</Select.Content>
						</Select.Root>
					</div>
				</div>

				<div className={quickActionsStyles.preferenceSection}>
					<div className={quickActionsStyles.preferenceHeader}>
						<div className={quickActionsStyles.preferenceLabel}>
							Switch Language
						</div>
						<p className={quickActionsStyles.preferenceDescription}>
							Cycle through available translations (i18n)
						</p>
					</div>
					<div className={quickActionsStyles.preferenceControl}>
						<Select.Root
							value={currentLanguage}
							onValueChange={handleSimulateLanguage}
							size="small"
						>
							<Select.Trigger className={quickActionsStyles.actionSelect}>
								{selectedLanguageOption?.flag && (
									<Select.TriggerIcon flag={selectedLanguageOption.flag} />
								)}
								<Select.Value
									placeholder={selectedLanguageOption?.label || 'Select...'}
								/>
							</Select.Trigger>
							<Select.Content>
								{languageOptions.map((option) => (
									<Select.Item key={option.value} value={option.value}>
										{option.flag && <Select.ItemIcon flag={option.flag} />}
										<span>{option.label}</span>
									</Select.Item>
								))}
							</Select.Content>
						</Select.Root>
					</div>
				</div>

				{state.locationInfo && (
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.1 }}
						className={styles.itemCard}
						style={{
							flexDirection: 'column',
							alignItems: 'flex-start',
							gap: '8px',
							width: '100%',
							maxWidth: '100%',
							overflow: 'hidden',
						}}
					>
						<div className={styles.itemContent}>
							<span className={styles.itemTitle}>Location Info</span>
						</div>
						<pre
							style={{
								fontSize: '12px',
								color: 'rgba(255, 255, 255, 0.7)',
								margin: 0,
								padding: '8px',
								background: 'rgba(0, 0, 0, 0.2)',
								borderRadius: '4px',
								overflow: 'auto',
								width: '100%',
								maxWidth: '100%',
								overflowWrap: 'break-word',
								wordBreak: 'break-word',
								whiteSpace: 'pre-wrap',
							}}
						>
							{JSON.stringify(state.locationInfo, null, 2)}
						</pre>
					</motion.div>
				)}
			</motion.div>
		</ScrollArea>
	);
}
