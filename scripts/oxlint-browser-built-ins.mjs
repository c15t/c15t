/**
 * Oxlint rules for built-ins that older browsers lack (#1658).
 *
 * `no-restricted-properties` can't ban `Array.prototype.at`: it would also
 * flag the `at` timestamp fields on taps and outbox entries. This rule flags
 * only `.at(...)` calls. Oxlint parses the file, so comments, strings and
 * the `<script>` blocks of Astro, Svelte and Vue components are handled.
 */
export default {
	meta: { name: 'c15t' },
	rules: {
		'no-array-at': {
			create(context) {
				return {
					CallExpression(node) {
						const { callee } = node;
						if (
							callee.type === 'MemberExpression' &&
							!callee.computed &&
							callee.property.name === 'at'
						) {
							context.report({
								message:
									'Chrome < 92, Firefox < 90 and Safari < 15.4 lack `.at()`. Index from length instead.',
								node: callee.property,
							});
						}
					},
				};
			},
			meta: { type: 'problem' },
		},
	},
};
