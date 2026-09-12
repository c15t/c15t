import { DEFAULT_OFFLINE_RULES } from '../templates/shared/options';
import {
	generateScriptsArrayValue,
	generateScriptsImport,
} from '../templates/shared/scripts';
import type { BoilerplateOptions, BoilerplateTemplate } from './types';

/** Generates a provider and stock UI without rewriting the application root. */
export const generateReactBoilerplate = (
	options: BoilerplateOptions
): BoilerplateTemplate => {
	const next = options.framework.startsWith('next-');
	const packageName = next ? '@c15t/nextjs' : '@c15t/react';
	const mode =
		options.mode === 'hosted'
			? `hosted({ url: ${JSON.stringify(options.backendURL)} })`
			: `offline({ policyRules: ${DEFAULT_OFFLINE_RULES} })`;
	const source = `${next ? "'use client';\n\n" : ''}import type { ReactNode } from 'react';
import { ConsentBanner, ConsentDialog, ConsentDialogLink, ConsentProvider, ${options.mode} } from '${packageName}';
${options.framework === 'next-pages' ? '' : `import '${packageName}/styles.css';`}
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
			...(options.scripts.length ? ['@c15t/scripts'] : []),
		],
		files: { 'consent-manager.tsx': source },
		instructions: [
			'Import ConsentManager from {{output}}/consent-manager using the relative path from your entry file.',
			`Mount <ConsentManager>{children}</ConsentManager> ${location}. Keep it mounted across navigation.`,
			...(options.framework === 'next-pages'
				? [`Add import '${packageName}/styles.css' to pages/_app.tsx.`]
				: []),
			'This wrapper initializes consent in the browser. It does not add server prefetch or a backend proxy.',
		],
	};
};
