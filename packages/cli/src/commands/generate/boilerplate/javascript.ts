import { DEFAULT_OFFLINE_RULES } from '../templates/shared/options';
import {
	generateScriptsArrayValue,
	generateScriptsImport,
} from '../templates/shared/scripts';
import type { BoilerplateOptions, BoilerplateTemplate } from './types';

/** Generates an explicitly owned browser runtime for headless applications. */
export const generateJavaScriptBoilerplate = (
	options: BoilerplateOptions
): BoilerplateTemplate => ({
	dependencies: [
		'@c15t/core',
		...(options.scripts.length ? ['@c15t/integrations'] : []),
	],
	files: {
		'consent.ts': `import { ${options.mode === 'hosted' ? 'hosted' : 'offline'} } from '@c15t/core';
import { createConsentRuntime } from '@c15t/core/runtime';
${generateScriptsImport(options.scripts)}

// Call once from your browser entry point. Dispose when the application unmounts.
export function startConsent() {
	const runtime = createConsentRuntime({
		mode: ${options.mode === 'hosted' ? `hosted({ url: ${JSON.stringify(options.backendURL)} })` : `offline({ policyRules: ${DEFAULT_OFFLINE_RULES} })`},
		pkg: '@c15t/core',
		${options.scripts.length ? `scripts: ${generateScriptsArrayValue(options.scripts, '\t\t')},` : ''}
	});
	runtime.start();
	return runtime;
}
`,
	},
	instructions: [
		'Import startConsent from {{output}}/consent in your browser entry point and call it once.',
		'This is headless boilerplate. Connect your UI to runtime.kernel.subscribe and snapshot.promptRequirement; gate scripts/features with snapshot.effectivePermissions.',
		"Use runtime.kernel.commands.save('all') to accept, save('none') to reject, or save({ marketing: false }) for a category choice. Use dismissNotice() only for notice acknowledgement.",
		'Provide a persistent privacy settings control. Call runtime.dispose() when the application unmounts.',
	],
});
