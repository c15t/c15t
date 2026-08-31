import { saveConsentToStorage } from '../../libs/cookie';
import type * as LibsCookieTypes from '../../libs/cookie';
import { getDebugLogger } from '../../libs/debug';
import type {
	SetConsentRequestBody,
	SetConsentResponse,
} from '../client-interface';
import type { FetchOptions, ResponseContext } from '../types';
import { API_ENDPOINTS } from '../types';
import type { FetcherContext } from './fetcher';
import { createResponseContext } from './fetcher';
import { withFallback } from './with-fallback';
/**
 * Provides offline mode fallback for setConsent API.
 * Simulates the behavior of OfflineClient when API requests fail.
 * @internal
 */
export const offlineFallbackForSetConsent =
	async function offlineFallbackForSetConsent(
		storageConfig: LibsCookieTypes.StorageConfig | undefined,
		options?: FetchOptions<SetConsentResponse, SetConsentRequestBody>
	): Promise<ResponseContext<SetConsentResponse>> {
		const pendingSubmissionsKey = 'c15t-pending-consent-submissions';

		// Get the client-generated subjectId from the request
		const subjectId = options?.body?.subjectId;

		try {
			if (typeof window !== 'undefined') {
				// Store the consent preferences locally in both localStorage and cookie
				saveConsentToStorage(
					{
						consentInfo: {
							externalId: options?.body?.externalSubjectId,
							identityProvider: options?.body?.identityProvider,
							subjectId,
							time: Date.now(),
						},
						consents: options?.body?.preferences || {},
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

						getDebugLogger().log(
							'Queued consent submission for retry on next page load'
						);
					}
				}
			}
		} catch (error) {
			// Ignore localStorage errors but log them
			console.warn(
				'Failed to write to localStorage in offline fallback:',
				error
			);
		}

		// Create a success response even if we couldn't save to localStorage
		// This prevents UI errors and allows the flow to continue
		const response = createResponseContext<SetConsentResponse>(
			true,
			null,
			null,
			null
		);

		// Call success callback if provided
		if (options?.onSuccess) {
			await options.onSuccess(response);
		}

		return response;
	};

/**
 * Sets consent preferences for a subject.
 * If the API request fails, falls back to offline mode behavior.
 */
export const setConsent = async function setConsent(
	context: FetcherContext,
	storageConfig: LibsCookieTypes.StorageConfig | undefined,
	options?: FetchOptions<SetConsentResponse, SetConsentRequestBody>
): Promise<ResponseContext<SetConsentResponse>> {
	saveConsentToStorage(
		{
			consentInfo: {
				externalId: options?.body?.externalSubjectId,
				identityProvider: options?.body?.identityProvider,
				subjectId: options?.body?.subjectId,
				time: Date.now(),
			},
			consents: options?.body?.preferences || {},
		},
		undefined,
		storageConfig
	);

	const response = await withFallback<
		SetConsentResponse,
		SetConsentRequestBody
	>(
		context,
		API_ENDPOINTS.POST_SUBJECT,
		'POST',
		options,
		// oxlint-disable-next-line require-await -- Async signature preserves the callback or public contract.
		async (fallbackOptions) =>
			offlineFallbackForSetConsent(storageConfig, fallbackOptions)
	);

	return response;
};
