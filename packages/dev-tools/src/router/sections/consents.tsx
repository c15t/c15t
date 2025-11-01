'use client';

import type { PrivacyConsentState } from 'c15t';
import { motion } from 'motion/react';
import { Badge } from '~/components/ui/badge';
import { ScrollArea } from '~/components/ui/scroll-area';
import styles from '../router.module.css';

interface ConsentsProps {
	state: PrivacyConsentState;
}

export function Consents({ state }: ConsentsProps) {
	const contentItems = Object.entries(state.consents).map(([name, value]) => ({
		title: name,
		status: value ? 'Enabled' : 'Disabled',
	}));

	return (
		<ScrollArea className={styles.scrollContainer}>
			<motion.div
				className={styles.contentContainer}
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				exit={{ opacity: 0 }}
			>
				{contentItems.map((item, index) => (
					<motion.div
						key={`consents-${item.title}`}
						className={styles.itemCard}
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: index * 0.05 }}
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
			</motion.div>
		</ScrollArea>
	);
}
