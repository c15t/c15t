/**
 * @fileoverview ScriptLoadingStatus component for displaying script loading status.
 * Shows loading states, errors, and success messages for analytics scripts.
 */

import { useAnalyticsScripts } from '../hooks/use-analytics-scripts';

/**
 * Props for ScriptLoadingStatus component
 */
export interface ScriptLoadingStatusProps {
	/** Show detailed status */
	showDetails?: boolean;
	/** Custom loading message */
	loadingMessage?: string;
	/** Custom error message */
	errorMessage?: string;
	/** Custom success message */
	successMessage?: string;
	/** CSS class name */
	className?: string;
}

/**
 * ScriptLoadingStatus component
 */
export function ScriptLoadingStatus({
	showDetails = false,
	loadingMessage = 'Loading analytics scripts...',
	errorMessage = 'Failed to load some analytics scripts',
	successMessage = 'Analytics scripts loaded',
	className = '',
}: ScriptLoadingStatusProps) {
	const { scripts, loading, error } = useAnalyticsScripts();

	if (loading) {
		return (
			<div className={`script-loading-status ${className}`}>
				<div className="script-loading-status__loading">
					<div className="script-loading-status__spinner" />
					<span>{loadingMessage}</span>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div
				className={`script-loading-status script-loading-status--error ${className}`}
			>
				<div className="script-loading-status__error">
					<span>
						⚠️ {errorMessage}: {error}
					</span>
				</div>
			</div>
		);
	}

	return (
		<div
			className={`script-loading-status script-loading-status--success ${className}`}
		>
			<div className="script-loading-status__success">
				<span>✅ {successMessage}</span>
				{showDetails && (
					<span className="script-loading-status__count">
						({scripts.size} scripts loaded)
					</span>
				)}
			</div>
		</div>
	);
}
