import { DEFAULT_OFFLINE_RULES } from './options.ts';
import { generateScriptsArrayValue, generateScriptsImport } from './scripts.ts';
import type { BoilerplateOptions, BoilerplateTemplate } from './types.ts';

/** Generates a provider and stock UI without rewriting the application root. */
export const generateReactBoilerplate = (
	options: BoilerplateOptions
): BoilerplateTemplate => {
	const next = options.framework.startsWith('next-');
	const packageName = next ? '@c15t/nextjs' : '@c15t/react';
	const mode =
		options.mode === 'hosted'
			? `hosted({ backendURL: ${JSON.stringify(options.backendURL)} })`
			: `offline({ policyRules: ${DEFAULT_OFFLINE_RULES} })`;
	const source = `${next ? "'use client';\n\n" : ''}import type { ReactNode } from 'react';
import { ConsentBanner, ConsentDialog, ConsentDialogLink, ConsentProvider, ${options.mode} } from '${packageName}';
${generateScriptsImport(options.scripts)}

const mode = ${mode};

export function ConsentManager({ children }: { children: ReactNode }) {
	return (
		<ConsentProvider options={{ mode${options.scripts.length ? `, scripts: ${generateScriptsArrayValue(options.scripts, '\t\t\t')}` : ''} }}>
			{children}
			<ConsentBanner />
			<ConsentDialog />
			<ConsentDialogLink>Privacy settings</ConsentDialogLink>
		</ConsentProvider>
	);
}
`;
	let location = 'around your application root';
	if (options.framework === 'next-app') {
		location = 'inside the <body> of your App Router root layout';
	}
	if (options.framework === 'next-pages') {
		location = 'around <Component {...pageProps} /> in pages/_app.tsx';
	}
	return {
		dependencies: [
			packageName,
			...(options.scripts.length ? ['@c15t/integrations'] : []),
		],
		files: { 'consent-manager.tsx': source },
		instructions: [
			'Import ConsentManager from {{output}}/consent-manager using the relative path from your entry file.',
			`Mount <ConsentManager>{children}</ConsentManager> ${location}. Keep it mounted across navigation.`,
			'This wrapper initializes consent in the browser. It does not add server prefetch or a backend proxy.',
		],
	};
};
