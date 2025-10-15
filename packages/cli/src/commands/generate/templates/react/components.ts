/**
 * Component template generators for React
 * Generates consent-manager.tsx component
 */

/**
 * Generates the consent-manager.tsx component template for React
 *
 * @param optionsText - The stringified options object for ConsentManagerProvider
 * @returns The complete component file content
 *
 * @remarks
 * This component wraps the React app with consent management.
 * Since React is client-only, we don't need to worry about SSR or separate client components.
 *
 * @example
 * ```ts
 * const content = generateConsentManagerTemplate('{ mode: "c15t", backendURL: "https://your-instance.c15t.dev" }');
 * ```
 */
export function generateConsentManagerTemplate(optionsText: string): string {
	return `import type { ReactNode } from 'react';
import {
	ConsentManagerDialog,
	ConsentManagerProvider,
	CookieBanner,
} from '@c15t/react';

/**
 * Consent management wrapper for React
 *
 * This component wraps your app with consent management functionality,
 * including the cookie banner, consent dialog, and provider.
 *
 * @param props - Component properties
 * @param props.children - Child components to render within the consent manager context
 *
 * @returns The consent manager provider with banner and dialog
 *
 * @example
 * \`\`\`tsx
 * // In your App.tsx
 * import { ConsentManager } from './consent-manager';
 *
 * export default function App() {
 *   return (
 *     <ConsentManager>
 *       <YourApp />
 *     </ConsentManager>
 *   );
 * }
 * \`\`\`
 */
export function ConsentManager({ children }: { children: ReactNode }) {
	return (
		<ConsentManagerProvider
			options={${optionsText}}
		>
			<CookieBanner />
			<ConsentManagerDialog />
			{children}
		</ConsentManagerProvider>
	);
}
`;
}
