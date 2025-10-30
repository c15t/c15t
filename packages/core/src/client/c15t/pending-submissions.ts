import type {
	SetConsentRequestBody,
	SetConsentResponse,
} from '../client-interface';
import { API_ENDPOINTS } from '../types';
import type { FetcherContext } from './fetcher';
import { fetcher } from './fetcher';
import { delay } from './utils';

/**
 * Check for pending consent submissions on initialization
 * @internal
 */
export function checkPendingConsentSubmissions(
	_context: FetcherContext,
	processPendingSubmissions: (
		submissions: SetConsentRequestBody[]
	) => Promise<void>
) {
	const pendingSubmissionsKey = 'c15t-pending-consent-submissions';

	// Don't attempt to access localStorage in SSR context
	if (typeof window === 'undefined' || !window.localStorage) {
		return;
	}

	try {
		// Test localStorage access first
		window.localStorage.setItem('c15t-storage-test-key', 'test');
		window.localStorage.removeItem('c15t-storage-test-key');

		const pendingSubmissionsStr = window.localStorage.getItem(
			pendingSubmissionsKey
		);
		if (!pendingSubmissionsStr) {
			return; // No pending submissions
		}

		const pendingSubmissions: SetConsentRequestBody[] = JSON.parse(
			pendingSubmissionsStr
		);
		if (!pendingSubmissions.length) {
			// Clean up empty array
			window.localStorage.removeItem(pendingSubmissionsKey);
			return;
		}

		console.log(
			`Found ${pendingSubmissions.length} pending consent submission(s) to retry`
		);

		// Process submissions asynchronously to avoid blocking page load
		setTimeout(() => {
			processPendingSubmissions(pendingSubmissions);
		}, 2000); // Delay to ensure page is loaded and network is likely available
	} catch (error) {
		// Ignore localStorage errors but log them
		console.warn('Failed to check for pending consent submissions:', error);
	}
}

/**
 * Process pending consent submissions
 * @internal
 */
export async function processPendingSubmissions(
	context: FetcherContext,
	submissions: SetConsentRequestBody[]
) {
	const pendingSubmissionsKey = 'c15t-pending-consent-submissions';
	const maxRetries = 3;
	const remainingSubmissions = [...submissions];

	for (let i = 0; i < maxRetries && remainingSubmissions.length > 0; i++) {
		// Try to send each pending submission
		const successfulSubmissions: number[] = [];

		for (let j = 0; j < remainingSubmissions.length; j++) {
			const submission = remainingSubmissions[j];
			try {
				console.log('Retrying consent submission:', submission);

				// Use the actual API endpoint, not our offlineFallback
				const response = await fetcher<
					SetConsentResponse,
					SetConsentRequestBody
				>(context, API_ENDPOINTS.SET_CONSENT, {
					method: 'POST',
					body: submission,
				});

				if (response.ok) {
					console.log('Successfully resubmitted consent');
					successfulSubmissions.push(j);
				}
			} catch (error) {
				console.warn('Failed to resend consent submission:', error);
				// Continue with the next submission
			}
		}

		// Remove successful submissions from the list (in reverse order to not affect indices)
		for (let k = successfulSubmissions.length - 1; k >= 0; k--) {
			const index = successfulSubmissions[k];
			if (index !== undefined) {
				remainingSubmissions.splice(index, 1);
			}
		}

		// If we've processed all submissions, exit the loop
		if (remainingSubmissions.length === 0) {
			break;
		}

		// Wait before retrying again
		if (i < maxRetries - 1) {
			await delay(1000 * (i + 1)); // Increasing delay between retries
		}
	}

	// Update storage with remaining submissions (if any)
	try {
		if (typeof window !== 'undefined' && window.localStorage) {
			if (remainingSubmissions.length > 0) {
				window.localStorage.setItem(
					pendingSubmissionsKey,
					JSON.stringify(remainingSubmissions)
				);
				console.log(
					`${remainingSubmissions.length} consent submissions still pending for future retry`
				);
			} else {
				// All submissions processed, clear the storage
				window.localStorage.removeItem(pendingSubmissionsKey);
				console.log('All pending consent submissions processed successfully');
			}
		}
	} catch (error) {
		console.warn('Error updating pending submissions storage:', error);
	}
}
