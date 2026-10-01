const fs = require('node:fs');
const path = require('node:path');

/**
 * Only these reach the bundle.
 *
 * React Native has no `process.env` at runtime, so anything the app reads has to
 * be substituted at build time. Scoping the rewrite to one prefix keeps a stray
 * `process.env` from being frozen into the bundle by accident, and keeps the
 * rest of the machine's environment out of the artifact.
 */
const PREFIX = 'C15T_';

/**
 * Read the `KEY=value` lines a `.env` file holds.
 *
 * Deliberately small: no variable expansion, no multiline values, no `export`
 * keyword. Anything cleverer belongs in a real dotenv package, and this fixture
 * only needs flat strings.
 *
 * @param {string} filePath Absolute path to the file.
 * @returns {Record<string, string>} The pairs it declares.
 */
const parseDotEnv = (filePath) => {
	if (!fs.existsSync(filePath)) {
		return {};
	}

	const values = {};

	for (const rawLine of fs.readFileSync(filePath, 'utf8').split(/\r?\n/u)) {
		const line = rawLine.trim();

		if (line.length === 0 || line.startsWith('#')) {
			continue;
		}

		const separator = line.indexOf('=');

		if (separator === -1) {
			continue;
		}

		const key = line.slice(0, separator).trim();

		if (!key.startsWith(PREFIX)) {
			continue;
		}

		let value = line.slice(separator + 1).trim();

		if (
			(value.startsWith('"') && value.endsWith('"')) ||
			(value.startsWith("'") && value.endsWith("'"))
		) {
			value = value.slice(1, -1);
		}

		values[key] = value;
	}

	return values;
};

// A real environment always wins, so CI and an inline `C15T_X=… bun run start`
// both beat whatever is sitting in a developer's `.env`.
const loaded = parseDotEnv(path.join(__dirname, '.env'));

for (const [key, value] of Object.entries(loaded)) {
	if (process.env[key] === undefined) {
		process.env[key] = value;
	}
}

/**
 * Replace `process.env.C15T_*` reads with their build-time value.
 *
 * @returns {object} A Babel plugin.
 */
const inlineC15tEnv = () => ({
	visitor: {
		MemberExpression(nodePath) {
			const { node } = nodePath;
			const { object, property } = node;

			if (
				!node.computed &&
				object.type === 'MemberExpression' &&
				!object.computed &&
				object.object.type === 'Identifier' &&
				object.object.name === 'process' &&
				object.property.type === 'Identifier' &&
				object.property.name === 'env' &&
				property.type === 'Identifier' &&
				property.name.startsWith(PREFIX)
			) {
				const value = process.env[property.name] ?? '';

				nodePath.replaceWith({
					extra: { rawValue: JSON.stringify(value) },
					loc: node.loc,
					type: 'StringLiteral',
					value,
				});
			}
		},
	},
});

module.exports = {
	plugins: [inlineC15tEnv],
	presets: ['module:@react-native/babel-preset'],
};
