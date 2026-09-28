const fs = require('node:fs');
const path = require('node:path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * The workspace root, two levels up.
 *
 * Bun keeps the real package directories in a store under the root and puts a symlink
 * in each workspace's own node_modules, and `@c15t/react-native` is a workspace link
 * like any other. Metro crawls the project directory and nothing else unless it is
 * told otherwise, so without this the bundler cannot see the SDK it is supposed to be
 * bundling even though TypeScript resolves it happily.
 */
const workspaceRoot = path.resolve(__dirname, '../..');

/**
 * Sibling workspaces that cannot hold a module this bundle needs.
 *
 * Watching the workspace root is what makes the linked SDK visible, and it is also a
 * multi-gigabyte tree, so the other apps, examples, benchmarks, and internals get
 * excluded. This is read from the filesystem rather than written as a pattern with a
 * negative lookahead in it, because the one directory that must stay visible is this
 * one: its own `node_modules` is where `react-native` resolves from, and a blockList
 * entry that matches it produces "Unable to resolve module react-native" from the
 * entry file, which reads like a broken install rather than a blocked crawl.
 */
const siblingGroups = ['apps', 'benchmarks', 'examples', 'internals'];

/**
 * @param {string[]} groups Workspace folders to enumerate.
 * @returns {string[]} Absolute paths of every sibling workspace in them.
 */
const siblingWorkspaces = (groups) =>
	groups.flatMap((group) => {
		const base = path.join(workspaceRoot, group);

		try {
			return fs
				.readdirSync(base, { withFileTypes: true })
				.filter(
					(entry) =>
						entry.isDirectory() && path.join(base, entry.name) !== __dirname
				)
				.map((entry) => path.join(base, entry.name));
		} catch {
			return [];
		}
	});

/**
 * Paths Metro should never open. Each entry is regular expression source matched
 * against a whole path, so a literal dot is written `\\.`.
 *
 * `packages/*\/dist` stays out of this list on purpose: the linked SDK's
 * `react-native` entry points into it, and blocking it would hide the very package
 * this app exists to exercise. `dist-types` is declaration files only, so nothing at
 * runtime can reach it.
 */
const blockedPaths = [
	`${workspaceRoot}/\\.repos/.*`,
	`${workspaceRoot}/docs/.*`,
	`${workspaceRoot}/native/.*`,
	...siblingWorkspaces(siblingGroups).map((dir) => `${dir}/.*`),
	`${workspaceRoot}/packages/[^/]+/(\\.turbo|coverage|dist-types)/.*`,
];

/**
 * The one regex Metro reads, built by hand.
 *
 * Metro 0.87 ships an `exclusionList` helper that produces exactly this shape, but it
 * is not exposed through the package's exports map. The trailing anchor matters:
 * Metro tests whole paths.
 *
 * @type {RegExp}
 */
const blockList = new RegExp(`(${blockedPaths.join('|')})$`, 'u');

/**
 * Where Babel's runtime helpers live, for files outside this directory.
 *
 * React Native's Babel preset rewrites every transformed file, the linked SDK
 * included, to import helpers from `@babel/runtime`, and an isolated install layout
 * hides the app's copy from a linked package. An app that installs the package from
 * the registry does not need this.
 */
const runtimeHelpers = path.dirname(
	require.resolve('@babel/runtime/package.json')
);

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
	resolver: {
		blockList,
		extraNodeModules: {
			'@babel/runtime': runtimeHelpers,
		},
	},
	watchFolders: [workspaceRoot],
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
