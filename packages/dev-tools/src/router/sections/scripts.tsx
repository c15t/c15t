'use client';

import type { AllConsentNames, HasCondition, PrivacyConsentState } from 'c15t';
import { motion } from 'motion/react';
import { Badge } from '~/components/ui/badge';
import { ScrollArea } from '~/components/ui/scroll-area';
import styles from '../router.module.css';

interface ScriptsProps {
	state: PrivacyConsentState;
}

function formatCategory(category: HasCondition<AllConsentNames>): string {
	if (typeof category === 'string') {
		return category;
	}
	if (typeof category === 'object' && category !== null) {
		if ('and' in category) {
			const conditions = Array.isArray(category.and)
				? category.and
				: [category.and];
			return `AND(${conditions.map(formatCategory).join(', ')})`;
		}
		if ('or' in category) {
			const conditions = Array.isArray(category.or)
				? category.or
				: [category.or];
			return `OR(${conditions.map(formatCategory).join(', ')})`;
		}
		if ('not' in category) {
			return `NOT(${formatCategory(category.not)})`;
		}
	}
	return JSON.stringify(category);
}

export function Scripts({ state }: ScriptsProps) {
	const loadedScriptIds = new Set(
		state.loadedScripts ? Object.keys(state.loadedScripts) : []
	);
	const scripts = Array.isArray(state.scripts) ? state.scripts : [];
	const scriptItems = scripts.map((script) => ({
		id: script.id,
		src: script.src,
		category: script.category,
		categoryDisplay: formatCategory(script.category),
		alwaysLoad: script.alwaysLoad,
		callbackOnly: script.callbackOnly,
		isLoaded: loadedScriptIds.has(script.id),
	}));

	return (
		<ScrollArea className={styles.scrollContainer}>
			<motion.div
				className={styles.contentContainer}
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				exit={{ opacity: 0 }}
			>
				{scriptItems.length === 0 ? (
					<motion.div
						className={styles.itemCard}
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
					>
						<div className={styles.itemContent}>
							<span className={styles.itemTitle}>No scripts configured</span>
						</div>
					</motion.div>
				) : (
					scriptItems.map((script, index) => (
						<motion.div
							key={`script-${script.id}`}
							className={styles.itemCard}
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: index * 0.05 }}
						>
							<div className={styles.itemContent}>
								<span className={styles.itemTitle}>{script.id}</span>

								<span className={styles.itemDetails}>
									Category: {script.categoryDisplay}
								</span>
								{script.alwaysLoad && (
									<span className={styles.itemDetails}>Always loads</span>
								)}
								{script.callbackOnly && (
									<span className={styles.itemDetails}>Callback only</span>
								)}
							</div>
							<Badge variant={script.isLoaded ? 'default' : 'destructive'}>
								{script.isLoaded ? 'Loaded' : 'Not Loaded'}
							</Badge>
						</motion.div>
					))
				)}
			</motion.div>
		</ScrollArea>
	);
}
