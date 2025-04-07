import { createConsentClient } from 'c15t';
import type { ReactNode } from 'react';
import { expect } from 'vitest';
import { render } from 'vitest-browser-react';
import { ConsentManagerProvider } from '~/providers/consent-manager-provider';
import type { ThemeValue } from '~/types/theme';

interface ComponentStyles {
	component: ReactNode;
	testCases: {
		testId: string;
		styles: string | ThemeValue;
	}[];
	noStyle?: boolean;
}

async function testComponentStyles({
	component,
	testCases,
	noStyle = false,
}: ComponentStyles) {
	const c15tClient = createConsentClient({
		backendURL: '/api/c15t',
	});

	const { getByTestId } = render(
		<ConsentManagerProvider client={c15tClient} noStyle={noStyle}>
			{component}
		</ConsentManagerProvider>
	);

	for (const { testId, styles } of testCases) {
		// Verify element exists first
		const element = getByTestId(testId);

		if (typeof styles === 'string' || styles?.className) {
			// biome-ignore lint/style/noNonNullAssertion: will always be a string
			const classNames = (
				typeof styles === 'string' ? styles : styles?.className
			)!;
			if (classNames) {
				// biome-ignore lint/suspicious/noMisplacedAssertion: utility function - will be called inside tests
				await expect
					.element(element)
					.toHaveClass(classNames, { exact: noStyle });
			}
		}

		if (typeof styles === 'object' && styles?.style) {
			const styleEntries = Object.entries(styles.style).map(([key, value]) => {
				// Convert camelCase to kebab-case
				const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
				return [cssKey, value];
			});

			// Wait for a small delay to ensure styles are applied
			await new Promise((resolve) => setTimeout(resolve, 100));

			for (const [property, value] of styleEntries) {
				// biome-ignore lint/suspicious/noMisplacedAssertion: utility function - will be called inside tests
				await expect
					.element(element)
					.toHaveStyle({ [property as string]: value });
			}
		}
	}
}

export default testComponentStyles;
