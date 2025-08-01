import type { GetServerSideProps, GetServerSidePropsContext } from 'next';
import type { InitialData } from '../../types';
import { getC15TInitialData } from './utils/initial-data';

interface WithInitialC15TDataProps {
	initialC15TData?: InitialData;
}

/**
 * Higher-order function that automatically adds to any page.
 * For use in pages directory.
 * @param getServerSideProps - Optional existing getServerSideProps function
 * @returns Enhanced getServerSideProps with consent data
 *
 * @example
 * ```tsx
 * export const getServerSideProps = withInitialC15TData('https://your-instance.c15t.dev', getServerSideProps);
 * ```
 */
export function withInitialC15TData<
	Props extends Record<string, unknown> = Record<string, never>,
>(
	backendURL: string,
	getServerSideProps?: GetServerSideProps<Props>
): GetServerSideProps<Props & WithInitialC15TDataProps> {
	return async (context: GetServerSidePropsContext) => {
		let initialData: InitialData;

		try {
			initialData = await getC15TInitialData(
				backendURL,
				new Headers(context.req.headers as Record<string, string>)
			);
		} catch (error) {
			// Silently handle consent data fetch errors
			console.warn('Failed to fetch initial c15t data:', error);
		}
		// If there's an existing getServerSideProps, call it
		if (getServerSideProps) {
			const result = await getServerSideProps(context);

			if ('props' in result) {
				return {
					...result,
					props: {
						...(await result.props),
						initialC15TData: initialData ?? null,
					},
				};
			}

			return result;
		}

		// Return just the consent data if no existing props
		return {
			props: {
				initialC15TData: initialData ?? null,
			} as Props & WithInitialC15TDataProps,
		};
	};
}
