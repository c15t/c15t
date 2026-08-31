import { defineConfig } from 'oxlint';
import antiSlop from 'ultracite/oxlint/anti-slop';
import core from 'ultracite/oxlint/core';
import next from 'ultracite/oxlint/next';
import react from 'ultracite/oxlint/react';
import vue from 'ultracite/oxlint/vue';

const nextAppDirectories = [
	'benchmarks/bundle-test-app',
	'benchmarks/css-layer-preview',
	'benchmarks/nextjs-browser-bench',
	'benchmarks/no-tw-test',
	'benchmarks/react-browser-bench',
	'benchmarks/script-lifecycle-bench',
	'benchmarks/tw3-test',
	'benchmarks/tw4-test',
	'examples/demo',
] as const;

const nextAppFiles = nextAppDirectories.map(
	(directory) => `${directory}/**/*.{js,jsx,ts,tsx}`
);

const nonReactFrameworkFiles = [
	'apps/storybook-solid/**/*.{js,jsx,ts,tsx}',
	'apps/storybook-svelte/**/*.{js,jsx,ts,tsx}',
	'apps/storybook-vue/**/*.{js,jsx,ts,tsx}',
	'benchmarks/nuxt-browser-bench/**/*.{js,jsx,ts,tsx}',
	'examples/nuxt/**/*.{js,jsx,ts,tsx}',
	'packages/solid/**/*.{js,jsx,ts,tsx}',
	'packages/svelte/**/*.{js,jsx,ts,tsx}',
	'packages/vue/**/*.{js,jsx,ts,tsx}',
] as const;

// These rules reported existing violations during the migration. Every
// Ultracite rule not listed here was clean and remains enabled as an error.
// Re-enable deferred rules in focused changes that also fix their violations.
const deferredRules = [
	'arrow-body-style',
	'class-methods-use-this',
	'complexity',
	'curly',
	'default-case',
	'eqeqeq',
	'func-name-matching',
	'func-names',
	'func-style',
	'guard-for-in',
	'logical-assignment-operators',
	'max-classes-per-file',
	'no-await-in-loop',
	'no-bitwise',
	'no-dupe-keys',
	'no-empty',
	'no-empty-function',
	'no-eq-null',
	'no-inline-comments',
	'no-lonely-if',
	'no-loop-func',
	'no-negated-condition',
	'no-nested-ternary',
	'no-new',
	'no-new-func',
	'no-param-reassign',
	'no-plusplus',
	'no-promise-executor-return',
	'no-redeclare',
	'no-shadow',
	'no-template-curly-in-string',
	'no-unreachable',
	'no-unsafe-finally',
	'no-unsafe-optional-chaining',
	'no-unused-expressions',
	'no-unused-vars',
	'no-use-before-define',
	'no-useless-concat',
	'no-useless-constructor',
	'no-useless-return',
	'no-void',
	'no-warning-comments',
	'object-shorthand',
	'operator-assignment',
	'oxc/branches-sharing-code',
	'oxc/no-barrel-file',
	'prefer-arrow-callback',
	'prefer-const',
	'prefer-destructuring',
	'prefer-named-capture-group',
	'prefer-object-has-own',
	'prefer-object-spread',
	'prefer-rest-params',
	'prefer-template',
	'preserve-caught-error',
	'require-await',
	'require-unicode-regexp',
	'sort-keys',
	'unicorn/catch-error-name',
	'unicorn/consistent-existence-index-check',
	'unicorn/consistent-function-scoping',
	'unicorn/custom-error-definition',
	'unicorn/escape-case',
	'unicorn/filename-case',
	'unicorn/import-style',
	'unicorn/new-for-builtins',
	'unicorn/no-abusive-eslint-disable',
	'unicorn/no-array-for-each',
	'unicorn/no-array-method-this-argument',
	'unicorn/no-array-reduce',
	'unicorn/no-array-reverse',
	'unicorn/no-array-sort',
	'unicorn/no-await-expression-member',
	'unicorn/no-document-cookie',
	'unicorn/no-hex-escape',
	'unicorn/no-immediate-mutation',
	'unicorn/no-lonely-if',
	'unicorn/no-negated-condition',
	'unicorn/no-nested-ternary',
	'unicorn/no-new-array',
	'unicorn/no-object-as-default-parameter',
	'unicorn/no-typeof-undefined',
	'unicorn/no-unnecessary-array-splice-count',
	'unicorn/no-unreadable-array-destructuring',
	'unicorn/no-useless-error-capture-stack-trace',
	'unicorn/no-useless-fallback-in-spread',
	'unicorn/no-useless-length-check',
	'unicorn/no-useless-spread',
	'unicorn/no-useless-undefined',
	'unicorn/numeric-separators-style',
	'unicorn/prefer-add-event-listener',
	'unicorn/prefer-at',
	'unicorn/prefer-bigint-literals',
	'unicorn/prefer-classlist-toggle',
	'unicorn/prefer-code-point',
	'unicorn/prefer-default-parameters',
	'unicorn/prefer-dom-node-append',
	'unicorn/prefer-dom-node-dataset',
	'unicorn/prefer-dom-node-remove',
	'unicorn/prefer-export-from',
	'unicorn/prefer-import-meta-properties',
	'unicorn/prefer-logical-operator-over-ternary',
	'unicorn/prefer-math-trunc',
	'unicorn/prefer-modern-dom-apis',
	'unicorn/prefer-module',
	'unicorn/prefer-native-coercion-functions',
	'unicorn/prefer-number-coercion',
	'unicorn/prefer-optional-catch-binding',
	'unicorn/prefer-query-selector',
	'unicorn/prefer-response-static-json',
	'unicorn/prefer-set-has',
	'unicorn/prefer-single-call',
	'unicorn/prefer-spread',
	'unicorn/prefer-string-replace-all',
	'unicorn/prefer-string-slice',
	'unicorn/prefer-structured-clone',
	'unicorn/prefer-ternary',
	'unicorn/prefer-type-error',
	'unicorn/relative-url-style',
	'unicorn/require-module-specifiers',
	'unicorn/switch-case-braces',
	'unicorn/text-encoding-identifier-case',
] as const;

// The remaining anti-slop rules need focused code or architecture changes.
// Three anti-slop rules are already clean and stay enabled through the preset.
const deferredAntiSlopRules = [
	'anti-slop/no-chained-type-assertions',
	'anti-slop/no-known-value-widening',
	'anti-slop/no-runtime-typeof',
	'anti-slop/no-unknown-parameters',
	'anti-slop/no-unknown-returns',
	'anti-slop/no-unsafe-dictionary-type',
	'anti-slop/require-safety-comment-for-type-assertion',
] as const;

export default defineConfig({
	extends: [core, react, vue, antiSlop],
	ignorePatterns: [
		...core.ignorePatterns,
		'.agents/**',
		'.claude/**',
		'.codex/**',
		'.cursor/**',
		'.repos/**',
		'.tmp-bun/**',
		'packages/c15t/shims/**',
	],
	overrides: [
		{
			files: nextAppFiles,
			plugins: next.plugins,
			rules: next.rules,
		},
		{
			files: [...nonReactFrameworkFiles],
			rules: {
				// Vue composables also use the `use*` convention, but do not follow
				// React's component and hook call-order rules.
				'react/rules-of-hooks': 'off',
			},
		},
	],
	rules: {
		...Object.fromEntries(
			[...deferredRules, ...deferredAntiSlopRules].map((rule) => [rule, 'off'])
		),
		'jsdoc/check-tag-names': [
			'error',
			{
				definedTags: [
					'defaultValue',
					'experimental',
					'packageDocumentation',
					'remarks',
					'typeParam',
					'vitest-environment',
				],
			},
		],
	},
	settings: {
		next: {
			rootDir: [...nextAppDirectories],
		},
	},
});
