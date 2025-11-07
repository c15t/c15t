'use client';

import type { PrivacyConsentState } from 'c15t';
import { motion } from 'motion/react';
import { useState } from 'react';
import { Icon } from '~/components/icons';
import { Alert } from '~/components/ui/alert';
import { Button } from '~/components/ui/button';
import { ScrollArea } from '~/components/ui/scroll-area';
import quickActionsStyles from '../../components/actions/quick-actions.module.css';
import styles from '../router.module.css';

interface MiscProps {
	state: PrivacyConsentState;
}

export function Misc({ state }: MiscProps) {
	const [notification, setNotification] = useState<{
		type: 'success' | 'error';
		message: string;
	} | null>(null);

	const showNotification = (
		type: 'success' | 'error',
		message: string
	): void => {
		setNotification({ type, message });
		setTimeout(() => {
			setNotification(null);
		}, 3000);
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

				{state.config && (
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						className={styles.itemCard}
						style={{
							flexDirection: 'column',
							alignItems: 'flex-start',
							gap: '8px',
							marginBottom: '8px',
							width: '100%',
							maxWidth: '100%',
							overflow: 'hidden',
						}}
					>
						<div className={styles.itemContent}>
							<span className={styles.itemTitle}>Configuration</span>
						</div>
						<div
							style={{
								width: '100%',
								display: 'flex',
								flexDirection: 'column',
								gap: '4px',
							}}
						>
							<div className={styles.itemDetails}>
								<strong>Package:</strong> {state.config.pkg}
							</div>
							<div className={styles.itemDetails}>
								<strong>Version:</strong> {state.config.version}
							</div>
							<div className={styles.itemDetails}>
								<strong>Mode:</strong> {state.config.mode}
							</div>
							{state.config.meta &&
								Object.keys(state.config.meta).length > 0 && (
									<div style={{ marginTop: '8px' }}>
										<div
											className={styles.itemDetails}
											style={{ marginBottom: '4px' }}
										>
											<strong>Meta:</strong>
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
											{JSON.stringify(state.config.meta, null, 2)}
										</pre>
									</div>
								)}
						</div>
					</motion.div>
				)}

				{state.user && (
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.05 }}
						className={styles.itemCard}
						style={{
							flexDirection: 'column',
							alignItems: 'flex-start',
							gap: '8px',
							marginBottom: '8px',
							width: '100%',
							maxWidth: '100%',
							overflow: 'hidden',
						}}
					>
						<div className={styles.itemContent}>
							<span className={styles.itemTitle}>User</span>
						</div>
						<div
							style={{
								width: '100%',
								display: 'flex',
								flexDirection: 'column',
								gap: '4px',
							}}
						>
							<div className={styles.itemDetails}>
								<strong>ID:</strong> {state.user.id}
							</div>
							{state.user.identityProvider && (
								<div className={styles.itemDetails}>
									<strong>Identity Provider:</strong>{' '}
									{state.user.identityProvider}
								</div>
							)}
						</div>
					</motion.div>
				)}

				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.1 }}
				>
					<div className={quickActionsStyles.preferencesContainer}>
						<div className={quickActionsStyles.preferenceSection}>
							<div className={quickActionsStyles.preferenceHeader}>
								<div className={quickActionsStyles.preferenceLabel}>
									Export State
								</div>
								<p className={quickActionsStyles.preferenceDescription}>
									Download current state as JSON file
								</p>
							</div>
							<div className={quickActionsStyles.preferenceControl}>
								<Button
									onClick={handleExportState}
									variant="outline"
									size="sm"
									className={quickActionsStyles.actionButton}
								>
									<Icon name="external-link" size={16} />
								</Button>
							</div>
						</div>
					</div>
				</motion.div>
			</motion.div>
		</ScrollArea>
	);
}
