import { AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import './error-state.css';

export function ErrorState({
	namespace,
}: {
	namespace: string;
}) {
	return (
		<motion.div
			className="c15t-devtool-error-container"
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
		>
			<Alert variant="destructive" className="c15t-devtool-error-alert">
				<AlertCircle className="c15t-devtool-error-icon" />
				<AlertTitle className="c15t-devtool-error-title">
					SDK Initialization Failed
				</AlertTitle>

				<AlertDescription className="c15t-devtool-error-description">
					<p className="c15t-devtool-error-message">
						The c15t SDK could not be found in the global scope. This usually
						means either:
					</p>
					<ul className="c15t-devtool-error-list">
						<li>The namespace has been changed from its default value</li>
						<li>The SDK initialization failed</li>
					</ul>
					{namespace && (
						<p className="c15t-devtool-error-namespace">
							Current namespace:{' '}
							<code className="c15t-devtool-error-code">{namespace}</code>
						</p>
					)}
				</AlertDescription>
			</Alert>
		</motion.div>
	);
}
