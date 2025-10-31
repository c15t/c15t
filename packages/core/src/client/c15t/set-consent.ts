import { saveConsentToStorage } from '../../libs/cookie';
import type {
	SetConsentRequestBody,
	SetConsentResponse,
} from '../client-interface';
import type { FetchOptions, ResponseContext } from '../types';
import { API_ENDPOINTS } from '../types';
import type { FetcherContext } from './fetcher';
import { createResponseContext, fetcher } from './fetcher';

/**
 * Provides offline mode fallback for setConsent API.
 * Simulates the behavior of OfflineClient when API requests fail.
 * @internal
 */
export async function offlineFallbackForSetConsent(
	storageConfig: import('../../libs/cookie').StorageConfig | undefined,
	options?: FetchOptions<SetConsentResponse, SetConsentRequestBody>
): Promise<ResponseContext<SetConsentResponse>> {
	const pendingSubmissionsKey = 'c15t-pending-consent-submissions';

	try {
		if (typeof window !== 'undefined') {
			// Store the consent preferences locally in both localStorage and cookie
			saveConsentToStorage(
				{
					consents: options?.body?.preferences || {},
					consentInfo: {
						time: Date.now(),
						identified: Boolean(options?.body?.externalId),
					},
				},
				undefined,
				storageConfig
			);

			// Store the submission in the pending queue for retry on next page load
			if (options?.body && window.localStorage) {
				let pendingSubmissions: SetConsentRequestBody[] = [];

				try {
					const storedSubmissions = window.localStorage.getItem(
						pendingSubmissionsKey
					);
					if (storedSubmissions) {
						pendingSubmissions = JSON.parse(storedSubmissions);
					}
				} catch (e) {
					// If there's an error parsing existing submissions, start fresh
					console.warn('Error parsing pending submissions:', e);
					pendingSubmissions = [];
				}

				// Add this submission to the queue if not already present
				// We identify duplicates by checking the entire submission object
				const newSubmission = options.body;
				const isDuplicate = pendingSubmissions.some(
					(submission) =>
						JSON.stringify(submission) === JSON.stringify(newSubmission)
				);

				if (!isDuplicate) {
					pendingSubmissions.push(newSubmission);
					window.localStorage.setItem(
						pendingSubmissionsKey,
						JSON.stringify(pendingSubmissions)
					);

					console.log('Queued consent submission for retry on next page load');
				}
			}
		}
	} catch (error) {
		// Ignore localStorage errors but log them
		console.warn('Failed to write to localStorage in offline fallback:', error);
	}

	// Create a success response even if we couldn't save to localStorage
	// This prevents UI errors and allows the flow to continue
	const response = createResponseContext<SetConsentResponse>(
		true,
		null,
		null,
		null
	);

	if (response.ok && response.data) {
		saveConsentToStorage(
			{
				consents: options?.body?.preferences || {},
				consentInfo: {
					time: Date.now(),
					id: response.data.id,
				},
			},
			undefined,
			storageConfig
		);
	}

	// Call success callback if provided
	if (options?.onSuccess) {
		await options.onSuccess(response);
	}

	return response;
}

/**
 * Sets consent preferences for a subject.
 * If the API request fails, falls back to offline mode behavior.
 */
export async function setConsent(
	context: FetcherContext,
	storageConfig: import('../../libs/cookie').StorageConfig | undefined,
	options?: FetchOptions<SetConsentResponse, SetConsentRequestBody>
): Promise<ResponseContext<SetConsentResponse>> {
	try {
		// First try the actual API request
		const response = await fetcher<SetConsentResponse, SetConsentRequestBody>(
			context,
			API_ENDPOINTS.SET_CONSENT,
			{
				method: 'POST',
				...options,
			}
		);

		// If the request was successful
		if (response.ok && response.data) {
			saveConsentToStorage(
				{
					consents: options?.body?.preferences || {},
					consentInfo: {
						time: Date.now(),
						id: response.data.id,
						identified: Boolean(options?.body?.externalId),
					},
				},
				undefined,
				storageConfig
			);

			return response;
		}

		// If we got here, the request failed but didn't throw - fall back to offline mode
		console.warn(
			'API request failed, falling back to offline mode for setting consent'
		);
		return offlineFallbackForSetConsent(storageConfig, options);
	} catch (error) {
		// If an error was thrown, fall back to offline mode
		console.warn('Error setting consent, falling back to offline mode:', error);
		return offlineFallbackForSetConsent(storageConfig, options);
	}
}
