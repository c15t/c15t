import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import {
	applyEdits,
	findNodeAtLocation,
	modify,
	parseTree,
} from 'jsonc-parser';
import { inc, prerelease, rcompare, valid } from 'semver';
import { tegami } from 'tegami';
import type {
	BumpType,
	PublishPlan,
	Tegami,
	TegamiPlugin,
	WorkspacePackage,
} from 'tegami';
import { createCli } from 'tegami/cli';
import { github } from 'tegami/plugins/github';
import { NpmPackage } from 'tegami/providers/npm';

/** Linked packages align only when selected by a change or dependency update. */
export const linkedPackages = new Set([
	'c15t',
	'@c15t/backend',
	'@c15t/cli',
	'@c15t/core',
	'@c15t/dev-tools',
	'@c15t/iab',
	'@c15t/nextjs',
	'@c15t/node-sdk',
	'@c15t/react',
	'@c15t/tanstack-start',
	'@c15t/translations',
]);

/** Resolve a supported branch to an explicit npm tag and prerelease identifier. */
export const releaseLine = function releaseLine(
	branch: string,
	commit?: string
) {
	switch (branch) {
		case 'main':
			return { distTag: 'latest', prerelease: undefined };
		case 'v3':
			return { distTag: 'alpha', prerelease: 'alpha' };
		case '2.0.0':
			return { distTag: 'rc', prerelease: 'rc' };
		case 'canary':
			if (!commit || !/^[a-f\d]{40}$/u.test(commit)) {
				throw new Error('Canary releases require a full Git commit SHA.');
			}
			return { distTag: 'canary', prerelease: `canary-${commit}` };
		default:
			throw new Error(
				`Unsupported release branch: ${branch}. Set RELEASE_BRANCH to the PR target when running Tegami locally.`
			);
	}
};

const linkedVersion = function linkedVersion(
	version: string,
	type: BumpType,
	tag?: string
) {
	if (!tag) {
		return inc(version, type) ?? undefined;
	}
	if (prerelease(version)) {
		return inc(version, 'prerelease', tag) ?? undefined;
	}
	return inc(version, `pre${type}`, tag) ?? undefined;
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
			for (const member of members) {
				draft.dispatchPackage(member, (entry) => {
					const original = entry.bumpVersion;
					entry.bumpVersion = function bumpVersion(pkg) {
						return this.type
							? linkedVersion(highest, this.type, this.prerelease)
							: original.call(this, pkg);
					};
				});
			}
		},
		name: 'c15t-linked-packages',
	};
};

/** Reject versions that would escape the selected release channel. */
export const checkReleaseVersion = function checkReleaseVersion(
	branch: string,
	version: string
) {
	const tag = prerelease(version);
	const channels: Record<string, boolean> = {
		'2.0.0': tag?.[0] === 'rc',
		canary: /^\d+\.\d+\.\d+-canary-[a-f\d]{40}\.\d+$/u.test(version),
		main: tag === null,
		v3: /^3\.0\.0-alpha\.(?:0|[1-9]\d*)$/u.test(version),
	};
	if (!valid(version) || !channels[branch]) {
		throw new Error(`${version} is not a valid release for ${branch}.`);
	}
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
			if (plan.options.dryRun || plan.getPackagesToPublish().length === 0) {
				return;
			}
			for (const script of ['build:libs', 'check:publish-artifacts']) {
				execFileSync('bun', ['run', script], {
					cwd: this.cwd,
					stdio: 'inherit',
				});
			}
		},
		enforce: 'post',
		initPublishLock({ lock, draft }) {
			for (const pkg of this.graph.getPackages()) {
				if (!pkg.version || !draft.getPackageDraft(pkg.id)) {
					continue;
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
			let entry: unknown;
			while ((entry = lock.read('c15t:release'))) {
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
				const tags: Record<string, string> = {
					'2.0.0': 'rc',
					canary: 'canary',
					main: 'latest',
					v3: 'alpha',
				};
				if (
					!pkgPlan.npm ||
					pkgPlan.npm.distTag !== tags[lockBranch ?? ''] ||
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
	commit?: string;
	github?: boolean;
}

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
	commit,
	github: withGithub = true,
}: ReleaseOptions) {
	const line = releaseLine(branch, commit);
	return tegami({
		cwd,
		npm: {
			bumpDep: ({ kind, dependent }) => {
				if (dependent.manifest.private || kind === 'devDependencies') {
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
			{
				initDraft(draft) {
					if (branch === 'canary') {
						for (const pkg of this.graph.getPackages()) {
							draft.bumpPackage(pkg, { type: 'patch' });
						}
					}
				},
				name: 'c15t-canary-snapshots',
			},
			releaseChecks(branch, line.distTag),
			{
				applyCliDraft() {
					syncBunLockVersions(this.cwd, this.graph.getPackages());
					execFileSync(
						'bun',
						[
							'x',
							'oxfmt',
							'package.json',
							'bun.lock',
							'.tegami',
							...this.graph
								.getPackages()
								.map((pkg) => `${relative(this.cwd, pkg.path)}/package.json`),
						],
						{ cwd: this.cwd, stdio: 'inherit' }
					);
				},
				name: 'c15t-format-release',
			},
			...(withGithub
				? github({
						repo: 'c15t/c15t',
						versionPr:
							branch === 'canary'
								? false
								: { base: branch, branch: `tegami/version-packages-${branch}` },
					})
				: []),
		],
	});
};

/** Finish an existing release before CI can replace its publish lock. */
export const runReleaseCli = async function runReleaseCli(
	release: Tegami,
	args = process.argv.slice(2)
) {
	const command = [...args];
	if (
		command[0] === 'ci' &&
		(await release.getPublishStatus()).status === 'pending'
	) {
		command[0] = 'publish';
	}
	await createCli(release).parseAsync(command);
};

if (import.meta.main) {
	const branch =
		process.env.GITHUB_BASE_REF ||
		process.env.GITHUB_REF_NAME ||
		process.env.RELEASE_BRANCH ||
		execFileSync('git', ['branch', '--show-current'], {
			encoding: 'utf8',
		}).trim();
	const commit = execFileSync('git', ['rev-parse', 'HEAD'], {
		encoding: 'utf8',
	}).trim();
	await runReleaseCli(createRelease({ branch, commit }));
}
