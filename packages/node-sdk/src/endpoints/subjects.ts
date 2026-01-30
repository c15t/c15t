import type {
	GetSubjectOutput,
	GetSubjectQuery,
	ListSubjectsOutput,
	ListSubjectsQuery,
	PatchSubjectFullInput,
	PatchSubjectOutput,
	PostSubjectInput,
	PostSubjectOutput,
} from '@c15t/schema/types';
import type { FetcherContext } from '../fetcher';
import { fetcher } from '../fetcher';
import type { FetchOptions, ResponseContext } from '../types';

/**
 * API endpoint paths for subjects
 */
export const SUBJECTS_PATH = '/subjects';

/**
 * Create a new subject with consent preferences
 *
 * @param context - Fetcher context
 * @param input - Subject creation input
 * @param options - Optional fetch options
 * @returns Created subject response
 */
export async function createSubject(
	context: FetcherContext,
	input: PostSubjectInput,
	options?: FetchOptions<PostSubjectOutput, PostSubjectInput>
): Promise<ResponseContext<PostSubjectOutput>> {
	return fetcher<PostSubjectOutput, PostSubjectInput>(context, SUBJECTS_PATH, {
		method: 'POST',
		body: input,
		...options,
	});
}

/**
 * Get a subject by ID
 *
 * @param context - Fetcher context
 * @param id - Subject ID
 * @param query - Optional query parameters
 * @param options - Optional fetch options
 * @returns Subject data response
 */
export async function getSubject(
	context: FetcherContext,
	id: string,
	query?: GetSubjectQuery,
	options?: FetchOptions<GetSubjectOutput, never, GetSubjectQuery>
): Promise<ResponseContext<GetSubjectOutput>> {
	return fetcher<GetSubjectOutput, never, GetSubjectQuery>(
		context,
		`${SUBJECTS_PATH}/${id}`,
		{
			method: 'GET',
			query,
			...options,
		}
	);
}

/**
 * Update a subject (link external ID or update preferences)
 *
 * @param context - Fetcher context
 * @param id - Subject ID
 * @param input - Patch input with externalId or other fields
 * @param options - Optional fetch options
 * @returns Updated subject response
 */
export async function patchSubject(
	context: FetcherContext,
	id: string,
	input: Omit<PatchSubjectFullInput, 'id'>,
	options?: FetchOptions<PatchSubjectOutput, Omit<PatchSubjectFullInput, 'id'>>
): Promise<ResponseContext<PatchSubjectOutput>> {
	return fetcher<PatchSubjectOutput, Omit<PatchSubjectFullInput, 'id'>>(
		context,
		`${SUBJECTS_PATH}/${id}`,
		{
			method: 'PATCH',
			body: input,
			...options,
		}
	);
}

/**
 * List subjects with optional filtering
 *
 * @param context - Fetcher context
 * @param query - Query parameters for filtering
 * @param options - Optional fetch options
 * @returns List of subjects
 */
export async function listSubjects(
	context: FetcherContext,
	query?: ListSubjectsQuery,
	options?: FetchOptions<ListSubjectsOutput, never, ListSubjectsQuery>
): Promise<ResponseContext<ListSubjectsOutput>> {
	return fetcher<ListSubjectsOutput, never, ListSubjectsQuery>(
		context,
		SUBJECTS_PATH,
		{
			method: 'GET',
			query,
			...options,
		}
	);
}
