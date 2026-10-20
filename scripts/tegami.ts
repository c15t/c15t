import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import {
	applyEdits,
	findNodeAtLocation,
	modify,
	parse as parseJsonc,
	parseTree,
} from 'jsonc-parser';
import { inc, major, parse, prerelease, rcompare, valid } from 'semver';
import type {
	BumpType,
	ChangelogEntry,
	Draft,
	PublishPlan,
	Tegami,
	TegamiContext,
	TegamiPlugin,
	WorkspacePackage,
} from 'tegami';
import { tegami } from 'tegami';
import { createCli } from 'tegami/cli';
import { github } from 'tegami/plugins/github';
import { NpmPackage } from 'tegami/providers/npm';

/** The only branch this release line publishes from. */
export const releaseBranch = 'release/v1';

/** `@c15t/backend` 1.x stays at its last release; this line never republishes it. */
export const frozenPackages = new Set(['@c15t/backend']);

/**
 * The `linked` group from the 1.x Changesets config. Linked packages align
 * only when selected by a change or dependency update.
 */
export const linkedPackages = new Set([
	'c15t',
	'@c15t/backend',
	'@c15t/cli',
	'@c15t/dev-tools',
	'@c15t/nextjs',
	'@c15t/node-sdk',
	'@c15t/react',
	'@c15t/translations',
]);

/** Resolve a supported branch to an explicit npm tag and prerelease identifier. */
export const releaseLine = function releaseLine(branch: string) {
	if (branch === releaseBranch) {
		return { distTag: 'v1-legacy', prerelease: undefined };
	}
	throw new Error(
		`Unsupported release branch: ${branch}. The 1.x line releases only from ${releaseBranch}. Set RELEASE_BRANCH=${releaseBranch} when running Tegami locally.`
	);
};

/**
 * Bump a version, keeping prereleases semver-correct for the stable release
 * they lead to. Semver's `prerelease` increment never raises the base version,
 * so a minor note after `1.9.1-canary.0` would otherwise stay on `1.9.1`.
 */
export const nextVersion = function nextVersion(
	version: string,
	type: BumpType,
	tag?: string
) {
	if (!tag) {
		return inc(version, type) ?? undefined;
	}
	const parsed = parse(version);
	if (!parsed?.prerelease.length) {
		return inc(version, `pre${type}`, tag) ?? undefined;
	}
	const raises =
		(type === 'major' && (parsed.minor > 0 || parsed.patch > 0)) ||
		(type === 'minor' && parsed.patch > 0);
	return inc(version, raises ? `pre${type}` : 'prerelease', tag) ?? undefined;
};

const alignLinkedPackages = function alignLinkedPackages(): TegamiPlugin {
	return {
		initDraft(draft) {
			const members = this.graph
				.getPackages()
				.filter((pkg) => linkedPackages.has(pkg.name));
			const [highest] = members
				.flatMap((pkg) => (pkg.version ? [pkg.version] : []))
				.sort(rcompare);
			for (const pkg of this.graph.getPackages()) {
				// Linked members bump from the group's highest version.
				const base = linkedPackages.has(pkg.name) ? highest : pkg.version;
				draft.dispatchPackage(pkg, (entry) => {
					const original = entry.bumpVersion;
					entry.bumpVersion = function bumpVersion(current) {
						return this.type && base
							? nextVersion(base, this.type, this.prerelease)
							: original.call(this, current);
					};
				});
			}
			if (!highest) {
				return;
			}
			draft.addPolicy({
				id: 'c15t:linked',
				onUpdate({ pkg, packageDraft }) {
					if (!linkedPackages.has(pkg.name) || !packageDraft.type) {
						return;
					}
					const weights = { major: 3, minor: 2, patch: 1 };
					const type = members.reduce((highestType, member) => {
						const candidate = this.getPackageDraft(member.id)?.type;
						return candidate && weights[candidate] > weights[highestType]
							? candidate
							: highestType;
					}, packageDraft.type);
					for (const member of members) {
						// Unchanged members keep their version and stay out of the release.
						if (this.getPackageDraft(member.id)?.type) {
							this.bumpPackage(member, { type });
						}
					}
				},
			});
		},
		name: 'c15t-linked-packages',
	};
};

/** Reject versions that would escape the 1.x release line. */
export const checkReleaseVersion = function checkReleaseVersion(
	branch: string,
	version: string
) {
	const channels: Record<string, boolean> = {
		[releaseBranch]:
			valid(version) !== null &&
			prerelease(version) === null &&
			major(version) === 1,
	};
	if (!channels[branch]) {
		throw new Error(`${version} is not a valid release for ${branch}.`);
	}
};

/** Workspace entries in `bun.lock`, keyed by path; the root is `''`. */
const readBunLockWorkspaces = function readBunLockWorkspaces(cwd: string) {
	const lock = parseJsonc(readFileSync(join(cwd, 'bun.lock'), 'utf8')) as {
		workspaces?: Record<string, { version?: string }>;
	};
	return lock.workspaces ?? {};
};

/**
 * Bun packs `workspace:` ranges from the workspace versions in `bun.lock`, not
 * from each manifest. A stale entry would publish a wrong dependency version.
 */
export const findStaleBunLockVersions = function findStaleBunLockVersions(
	cwd: string,
	packages: Pick<WorkspacePackage, 'name' | 'path' | 'version'>[]
) {
	const workspaces = readBunLockWorkspaces(cwd);
	return packages.filter((pkg) => {
		const location = relative(cwd, pkg.path).replaceAll('\\', '/');
		return pkg.version && workspaces[location]?.version !== pkg.version;
	});
};

interface ReleaseRecord {
	branch: string;
	id: string;
	version: string;
}

const isReleaseRecord = function isReleaseRecord(
	entry: unknown
): entry is ReleaseRecord {
	return (
		typeof entry === 'object' &&
		entry !== null &&
		'branch' in entry &&
		typeof entry.branch === 'string' &&
		'id' in entry &&
		typeof entry.id === 'string' &&
		'version' in entry &&
		typeof entry.version === 'string'
	);
};

const releaseChecks = function releaseChecks(
	branch: string,
	distTag: string
): TegamiPlugin {
	const planBranches = new WeakMap<PublishPlan, string>();
	const baselines = new WeakMap<Draft, Map<string, string | undefined>>();
	return {
		beforePublishAll({ plan }) {
			if (planBranches.get(plan) !== branch) {
				throw new Error(
					`Publish lock does not belong to ${branch}. Publish it on its original branch first.`
				);
			}
			for (const pkgPlan of plan.packages.values()) {
				if (
					pkgPlan.updated &&
					(pkgPlan.npm?.distTag !== distTag || pkgPlan.npm.markLatest)
				) {
					throw new Error(`Publish lock npm tag does not match ${distTag}.`);
				}
			}
			const packages = plan.getPackagesToPublish();
			if (plan.options.dryRun || packages.length === 0) {
				return;
			}
			const frozen = packages.filter((pkg) => frozenPackages.has(pkg.name));
			if (frozen.length > 0) {
				throw new Error(
					`${frozen.map((pkg) => pkg.name).join(', ')} must not publish from ${branch}.`
				);
			}
			const stale = findStaleBunLockVersions(
				this.cwd,
				this.graph.getPackages()
			);
			if (stale.length > 0) {
				throw new Error(
					`bun.lock has stale workspace versions for ${stale.map((pkg) => pkg.name).join(', ')}. Packed workspace: dependencies would be wrong.`
				);
			}
			// ^build brings in forward dependencies; unrelated libraries stay out.
			execFileSync(
				'bun',
				[
					'turbo',
					'run',
					'build',
					...packages.map((pkg) => `--filter=${pkg.name}`),
				],
				{ cwd: this.cwd, stdio: 'inherit' }
			);
		},
		enforce: 'post',
		initDraft(draft) {
			baselines.set(
				draft,
				new Map(this.graph.getPackages().map((pkg) => [pkg.id, pkg.version]))
			);
		},
		initPublishLock({ lock, draft }) {
			const baseline = baselines.get(draft);
			for (const pkg of this.graph.getPackages()) {
				if (
					!pkg.version ||
					!draft.getPackageDraft(pkg.id) ||
					baseline?.get(pkg.id) === pkg.version
				) {
					continue;
				}
				if (frozenPackages.has(pkg.name)) {
					throw new Error(
						`${pkg.name} must not release from ${branch}. Remove it from the release notes.`
					);
				}
				checkReleaseVersion(branch, pkg.version);
				lock.write('c15t:release', {
					branch,
					id: pkg.id,
					version: pkg.version,
				});
			}
		},
		initPublishPlan({ lock, plan }) {
			const versions = new Map<string, string>();
			let lockBranch: string | undefined;
			for (
				let entry: unknown = lock.read('c15t:release');
				entry;
				entry = lock.read('c15t:release')
			) {
				if (
					!isReleaseRecord(entry) ||
					(lockBranch !== undefined && entry.branch !== lockBranch)
				) {
					throw new Error('Publish lock has invalid release metadata.');
				}
				lockBranch = entry.branch;
				versions.set(entry.id, entry.version);
			}
			if (lockBranch) {
				planBranches.set(plan, lockBranch);
			}
			for (const [id, pkgPlan] of plan.packages) {
				if (!pkgPlan.updated) {
					continue;
				}
				const pkg = this.graph.get(id);
				if (!pkg?.version || versions.get(id) !== pkg.version) {
					throw new Error(`Publish lock version does not match ${id}.`);
				}
				checkReleaseVersion(lockBranch ?? '', pkg.version);
				if (
					!pkgPlan.npm ||
					pkgPlan.npm.distTag !== releaseLine(lockBranch ?? '').distTag ||
					pkgPlan.npm.markLatest
				) {
					throw new Error(
						'Publish lock npm tag does not match its release branch.'
					);
				}
			}
		},
		name: 'c15t-release-checks',
		resolve() {
			for (const pkg of this.graph.getPackages()) {
				if (pkg instanceof NpmPackage && pkg.manifest.private) {
					this.graph.delete(pkg.id);
				}
			}
		},
	};
};

interface ReleaseOptions {
	cwd?: string;
	branch: string;
	github?: boolean;
}

/** GitHub rejects pull request bodies longer than this many characters. */
export const versionPrBodyLimit = 65_536;

interface VersionPrBodyOptions {
	draft: Draft;
	plan: PublishPlan | undefined;
	getPreviousVersion: (packageId: string) => string | undefined;
}

const versionPrPublishRows = function versionPrPublishRows(
	graph: Pick<TegamiContext['graph'], 'get'>,
	plan: PublishPlan | undefined
) {
	const rows: string[] = [];
	for (const [id, { preflight, npm }] of plan?.packages ?? []) {
		const pkg = graph.get(id);
		if (pkg && preflight?.shouldPublish) {
			const tag = npm?.distTag ? ` (dist-tag: ${npm.distTag})` : '';
			rows.push(`| \`${pkg.name}\` | \`${pkg.version}\`${tag} |`);
		}
	}
	return rows;
};

/**
 * Render the version PR body with one line per release note. Tegami's default
 * body repeats every note in full, which outgrows GitHub's limit on a large
 * release. The full text is still in the PR's generated changelogs.
 */
export const renderVersionPrBody = function renderVersionPrBody(
	graph: Pick<TegamiContext['graph'], 'get'>,
	{ draft, plan, getPreviousVersion }: VersionPrBodyOptions
) {
	const versionRows: string[] = [];
	const notes = new Map<ChangelogEntry, string[]>();
	for (const [id, packageDraft] of draft.getPackageDrafts()) {
		const pkg = graph.get(id);
		if (!pkg) {
			continue;
		}
		for (const entry of packageDraft.changelogs ?? []) {
			notes.set(entry, [...(notes.get(entry) ?? []), pkg.name]);
		}
		const from = getPreviousVersion(id);
		if (from && pkg.version && from !== pkg.version) {
			versionRows.push(
				`| \`${pkg.name}\` | \`${from}\` | \`${pkg.version}\` |`
			);
		}
	}

	const publishRows = versionPrPublishRows(graph, plan);
	const head = ['## Versions', ''];
	if (versionRows.length > 0) {
		head.push(
			'| Package | From | To |',
			'| --- | --- | --- |',
			...versionRows.sort()
		);
	}
	head.push(
		'',
		'## Release notes',
		'',
		'Full text is in each package `CHANGELOG.md` in this PR.',
		''
	);
	const tail = publishRows.length
		? [
				'',
				'## Publish',
				'',
				'Merging publishes:',
				'',
				'| Package | Version |',
				'| --- | --- |',
				...publishRows,
			]
		: [];

	const noteRows = [...notes].map(([entry, names]) => {
		const title = entry.subject ?? entry.sections[0]?.title ?? entry.filename;
		return `- **${title}** (\`${entry.filename}\`): ${names.sort().join(', ')}`;
	});
	const render = (rows: string[]) =>
		`${[...head, ...rows, ...tail].join('\n')}\n`;
	let body = render(noteRows);
	// Drop note lines from the end until the body fits, and say how many.
	for (
		let kept = noteRows.length - 1;
		body.length > versionPrBodyLimit && kept >= 0;
		kept -= 1
	) {
		body = render([
			...noteRows.slice(0, kept),
			`- …and ${noteRows.length - kept} more release notes.`,
		]);
	}
	return body;
};

/** Bun 1.3.11 does not refresh workspace versions for version-only manifest edits. */
export const syncBunLockVersions = function syncBunLockVersions(
	cwd: string,
	packages: Pick<WorkspacePackage, 'path' | 'version'>[]
) {
	const path = join(cwd, 'bun.lock');
	const original = readFileSync(path, 'utf8');
	let content = original;
	for (const pkg of packages) {
		if (!pkg.version) {
			continue;
		}
		const location = [
			'workspaces',
			relative(cwd, pkg.path).replaceAll('\\', '/'),
		];
		const tree = parseTree(content);
		if (!tree || !findNodeAtLocation(tree, location)) {
			throw new Error(`Workspace ${pkg.path} is missing from bun.lock.`);
		}
		content = applyEdits(
			content,
			modify(content, [...location, 'version'], pkg.version, {})
		);
	}
	if (content !== original) {
		writeFileSync(path, content);
	}
};

/** Create the release workflow. Drafts can be tested without GitHub or publishing. */
export const createRelease = function createRelease({
	cwd = process.cwd(),
	branch,
	github: withGithub = true,
}: ReleaseOptions) {
	const line = releaseLine(branch);
	return tegami({
		cwd,
		npm: {
			bumpDep: ({ kind, dependent }) => {
				if (
					dependent.manifest.private ||
					frozenPackages.has(dependent.name) ||
					kind === 'devDependencies'
				) {
					return false;
				}
				return kind === 'peerDependencies' ? 'major' : 'patch';
			},
			client: 'bun',
			updateLockFile: true,
		},
		packages: () => ({
			npm: { distTag: line.distTag },
			prerelease: line.prerelease,
		}),
		plugins: [
			alignLinkedPackages(),
			releaseChecks(branch, line.distTag),
			{
				applyCliDraft() {
					syncBunLockVersions(this.cwd, this.graph.getPackages());
					// Tegami rewrites every workspace manifest, including private ones
					// outside the graph, with two-space indentation; restore tabs.
					execFileSync(
						'bun',
						[
							'x',
							'biome',
							'format',
							'--write',
							...Object.keys(readBunLockWorkspaces(this.cwd)).map((path) =>
								path ? `${path}/package.json` : 'package.json'
							),
						],
						{ cwd: this.cwd, stdio: 'inherit' }
					);
				},
				name: 'c15t-format-release',
			},
			...(withGithub
				? github({
						// GitHub marks every new release as the repo's latest, which
						// would put 1.x above 3.x. Tags and changelogs still record
						// each release.
						release: false,
						repo: 'c15t/c15t',
						versionPr: {
							base: branch,
							// A slash after the prefix would nest the ref under `release`.
							branch: `tegami/version-packages-${branch.replaceAll('/', '-')}`,
							create(options) {
								return { body: renderVersionPrBody(this.graph, options) };
							},
						},
					})
				: []),
		],
	});
};

/**
 * Finish an existing release before CI can replace its publish lock.
 *
 * Once that release is out, CI continues as normal, so notes that arrived
 * after the version PR was merged get their own version PR. Release checks
 * for consecutive pushes overlap, so no later run is guaranteed to do it.
 */
export const runReleaseCli = async function runReleaseCli(
	release: Tegami,
	args = process.argv.slice(2)
) {
	if (
		args[0] === 'ci' &&
		(await release.getPublishStatus()).status === 'pending'
	) {
		await createCli(release).parseAsync(['publish', ...args.slice(1)]);
		if ((await release.getPublishStatus()).status === 'pending') {
			console.warn(
				'The release is still pending after publishing, so new notes wait for the next run.'
			);
			return;
		}
	}
	await createCli(release).parseAsync(args);
};

if (import.meta.main) {
	const branch =
		process.env.GITHUB_BASE_REF ||
		process.env.GITHUB_REF_NAME ||
		process.env.RELEASE_BRANCH ||
		execFileSync('git', ['branch', '--show-current'], {
			encoding: 'utf8',
		}).trim();
	await runReleaseCli(createRelease({ branch }));
}
