'use client';

import type { PrivacyConsentState } from 'c15t';
import { motion } from 'motion/react';
import { useState } from 'react';
import { Icon } from '~/components/icons';
import { Alert } from '~/components/ui/alert';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { ScrollArea } from '~/components/ui/scroll-area';
import quickActionsStyles from '../../components/actions/quick-actions.module.css';
import styles from '../router.module.css';

interface ConsentsProps {
	state: PrivacyConsentState;
}

export function Consents({ state }: ConsentsProps) {
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

	const handleToggleConsent = (consentName: string): void => {
		try {
			const currentValue =
				state.consents[consentName as keyof typeof state.consents];
			state.setConsent(
				consentName as keyof typeof state.consents,
				!currentValue
			);
			showNotification(
				'success',
				`${consentName} ${!currentValue ? 'enabled' : 'disabled'}`
			);
		} catch {
			showNotification('error', `Failed to toggle ${consentName}`);
		}
	};

	const handleClearStorage = (): void => {
		try {
			state.resetConsents();
			showNotification('success', 'Storage cleared and consents reset');
		} catch {
			showNotification('error', 'Failed to clear storage and reset consents');
		}
	};

	const contentItems = Object.entries(state.consents).map(([name, value]) => ({
		title: name,
		status: value ? 'Enabled' : 'Disabled',
		value,
	}));

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

				{contentItems.map((item, index) => (
					<motion.div
						key={`consents-${item.title}`}
						className={styles.itemCard}
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: index * 0.05 }}
						onClick={() => handleToggleConsent(item.title)}
						style={{ cursor: 'pointer' }}
					>
						<div className={styles.itemContent}>
							<span className={styles.itemTitle}>{item.title}</span>
						</div>
						<Badge
							variant={item.status === 'Enabled' ? 'default' : 'destructive'}
						>
							{item.status}
						</Badge>
					</motion.div>
				))}

				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: contentItems.length * 0.05 }}
					style={{ marginTop: '8px' }}
				>
					<div className={quickActionsStyles.preferencesContainer}>
						<div className={quickActionsStyles.preferenceSection}>
							<div className={quickActionsStyles.preferenceHeader}>
								<div className={quickActionsStyles.preferenceLabel}>
									Clear Storage
								</div>
								<p className={quickActionsStyles.preferenceDescription}>
									Remove stored consent data from browser
								</p>
							</div>
							<div className={quickActionsStyles.preferenceControl}>
								<Button
									onClick={handleClearStorage}
									variant="outline"
									size="sm"
									className={quickActionsStyles.actionButton}
								>
									<Icon name="minus" size={16} />
								</Button>
							</div>
						</div>
					</div>
				</motion.div>
			</motion.div>
		</ScrollArea>
	);
}
