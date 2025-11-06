import { getConsentFromStorage, saveConsentToStorage } from '../../libs/cookie';
import type { ConsentInfo } from '../../types/gdpr';
import type {
	IdentifyUserRequestBody,
	IdentifyUserResponse,
} from '../client-interface';
import type { FetchOptions, ResponseContext } from '../types';
import { API_ENDPOINTS } from '../types';
import type { FetcherContext } from './fetcher';
import { createResponseContext } from './fetcher';
import { withFallback } from './with-fallback';

interface StoredConsent {
	consents: Record<string, boolean>;
	consentInfo: ConsentInfo | null;
}

/**
 * Updates local storage to mark consent as identified.
 * @internal
 */
function updateConsentStorage(
	storageConfig: import('../../libs/cookie').StorageConfig | undefined
): void {
	try {
		if (typeof window !== 'undefined') {
			// Read existing consent data
			const existingData = getConsentFromStorage<StoredConsent>(storageConfig);

			if (existingData?.consentInfo) {
				// Update consent info to mark as identified
				saveConsentToStorage(
					{
						consents: existingData.consents || {},
						consentInfo: {
							...existingData.consentInfo,
							identified: true,
							time: existingData.consentInfo.time ?? Date.now(),
						},
					},
					undefined,
					storageConfig
				);
			} else if (existingData) {
				// If consent exists but no consentInfo, create one
				saveConsentToStorage(
					{
						consents: existingData.consents || {},
						consentInfo: {
							identified: true,
							time: Date.now(),
						},
					},
					undefined,
					storageConfig
				);
			}
		}
	} catch (error) {
		// Don't fail the request if storage update fails, just log a warning
		console.warn(
			'Failed to update consent storage after identification:',
			error
		);
	}
}

/**
 * Provides offline mode fallback for identifyUser API.
 * Simulates the behavior of OfflineClient when API requests fail.
 * @internal
 */
export async function offlineFallbackForIdentifyUser(
	storageConfig: import('../../libs/cookie').StorageConfig | undefined,
	options?: FetchOptions<IdentifyUserResponse, IdentifyUserRequestBody>
): Promise<ResponseContext<IdentifyUserResponse>> {
	const pendingSubmissionsKey = 'c15t-pending-identify-user-submissions';

	try {
		if (typeof window !== 'undefined') {
			// Update local storage to mark as identified
			updateConsentStorage(storageConfig);

			// Store the submission in the pending queue for retry on next page load
			if (options?.body && window.localStorage) {
				let pendingSubmissions: IdentifyUserRequestBody[] = [];

				try {
					const storedSubmissions = window.localStorage.getItem(
						pendingSubmissionsKey
					);
					if (storedSubmissions) {
						const parsed = JSON.parse(storedSubmissions);
						// Ensure parsed value is an array
						if (Array.isArray(parsed)) {
							pendingSubmissions = parsed;
						}
					}
				} catch (e) {
					// If there's an error parsing existing submissions, start fresh
					console.warn('Error parsing pending identify-user submissions:', e);
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

					console.log(
						'Queued identify-user submission for retry on next page load'
					);
				}
			}
		}
	} catch (error) {
		// Ignore localStorage errors but log them
		console.warn('Failed to write to localStorage in offline fallback:', error);
	}

	// Create a success response even if we couldn't save to localStorage
	// This prevents UI errors and allows the flow to continue
	const response = createResponseContext<IdentifyUserResponse>(
		true,
		{ success: true },
		null,
		null
	);

	// Call success callback if provided
	if (options?.onSuccess) {
		await options.onSuccess(response);
	}

	return response;
}

/**
 * Links a subject's external ID to a consent record by consent ID.
 * If the API request fails, falls back to offline mode behavior.
 */
export async function identifyUser(
	context: FetcherContext,
	storageConfig: import('../../libs/cookie').StorageConfig | undefined,
	options?: FetchOptions<IdentifyUserResponse, IdentifyUserRequestBody>
): Promise<ResponseContext<IdentifyUserResponse>> {
	const response = await withFallback<
		IdentifyUserResponse,
		IdentifyUserRequestBody
	>(
		context,
		API_ENDPOINTS.IDENTIFY_CONSENT,
		'PATCH',
		options,
		async (fallbackOptions) => {
			return offlineFallbackForIdentifyUser(storageConfig, fallbackOptions);
		}
	);

	// If the request was successful, update stored consent to mark as identified
	if (response.ok && response.data) {
		updateConsentStorage(storageConfig);
	}

	return response;
}
