import { AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import styles from './error-state.module.css';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

export function ErrorState({ namespace }: { namespace: string }) {
	return (
		<motion.div
			className={styles.container}
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
		>
			<Alert variant="destructive" className={styles.alert}>
				<AlertCircle className={styles.icon} />
				<AlertTitle className={styles.title}>
					SDK Initialization Failed
				</AlertTitle>

				<AlertDescription className={styles.description}>
					<p className={styles.message}>
						The c15t SDK could not be found in the global scope. This usually
						means either:
					</p>
					<ul className={styles.list}>
						<li>The namespace has been changed from its default value</li>
						<li>The SDK initialization failed</li>
					</ul>
					{namespace && (
						<p className={styles.namespace}>
							Current namespace:{' '}
							<code className={styles.code}>{namespace}</code>
						</p>
					)}
				</AlertDescription>
			</Alert>
		</motion.div>
	);
}
