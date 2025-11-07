'use client';

import { QuickActions } from '~/components/actions/quick-actions';
import { ScrollArea } from '~/components/ui/scroll-area';
import styles from '../router.module.css';

export function Actions() {
	return (
		<ScrollArea className={styles.scrollContainer}>
			<div className={styles.contentContainer}>
				<QuickActions />
			</div>
		</ScrollArea>
	);
}
