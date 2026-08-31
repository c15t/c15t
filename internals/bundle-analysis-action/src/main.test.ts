import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PackageBundleData } from './analyze/bundle-analysis';
import { run } from './main';

describe('main', () => {
	const mockPackages: PackageBundleData[] = [
		{
			baseBundles: [],
			currentBundles: [],
			diffs: {
				added: [],
				changed: [],
				removed: [],
			},
			packageName: 'test-package',
			totalBaseSize: 1000,
			totalCurrentSize: 1100,
			totalDiff: 100,
			totalDiffPercent: 10,
		},
	];

	const mockOctokit = {
		rest: {
			issues: {
				createComment: vi.fn(),
				listComments: vi.fn(),
				updateComment: vi.fn(),
			},
		},
	};

	const dependencies = {
		actionCore: {
			info: vi.fn(),
			setFailed: vi.fn(),
			setOutput: vi.fn(),
		},
		analyzeBundles: vi.fn(),
		analyzeTransitiveImpact: vi.fn(),
		calculateTotalDiffPercent: vi.fn(),
		ensureComment: vi.fn(),
		getOctokit: vi.fn(),
		inputs: {
			baseDir: '.bundle-base',
			currentDir: '.',
			failOnIncrease: false,
			githubToken: 'test-token',
			header: 'bundle-analysis',
			packagesDir: 'packages',
			prNumber: 123 as number | undefined,
			repo: { owner: 'test', repo: 'test-repo' },
			skipComment: false,
			threshold: 10,
			transitiveRoots: ['c15t', '@c15t/react'],
		},
		readFileSync: vi.fn(),
		writeReport: vi.fn(),
	};

	beforeEach(() => {
		vi.clearAllMocks();
		dependencies.analyzeBundles.mockResolvedValue(mockPackages);
		dependencies.analyzeTransitiveImpact.mockReturnValue([]);
		dependencies.calculateTotalDiffPercent.mockReturnValue(10);
		dependencies.getOctokit.mockReturnValue(mockOctokit);
		dependencies.readFileSync.mockReturnValue('# Report content');
		dependencies.inputs.prNumber = 123;
		dependencies.inputs.skipComment = false;
		dependencies.inputs.failOnIncrease = false;
		dependencies.inputs.threshold = 10;
	});

	it('analyzes bundles and generates the report outputs', async () => {
		await run(dependencies);

		expect(dependencies.analyzeBundles).toHaveBeenCalledWith(
			'.bundle-base',
			'.',
			'packages'
		);
		expect(dependencies.analyzeTransitiveImpact).toHaveBeenCalledWith(
			mockPackages,
			'.',
			'packages',
			['c15t', '@c15t/react'],
			'.bundle-base'
		);
		expect(dependencies.writeReport).toHaveBeenCalledWith(
			mockPackages,
			'bundle-diff.md',
			[]
		);
		expect(dependencies.actionCore.setOutput).toHaveBeenCalledWith(
			'report_path',
			'bundle-diff.md'
		);
		expect(dependencies.actionCore.setOutput).toHaveBeenCalledWith(
			'has_changes',
			true
		);
		expect(dependencies.actionCore.setOutput).toHaveBeenCalledWith(
			'total_diff_percent',
			'10.00'
		);
	});

	it('posts a pull request comment when enabled', async () => {
		await run(dependencies);

		expect(dependencies.getOctokit).toHaveBeenCalledWith('test-token');
		expect(dependencies.ensureComment).toHaveBeenCalledWith(
			mockOctokit,
			{ owner: 'test', repo: 'test-repo' },
			123,
			'# Report content',
			'bundle-analysis'
		);
	});

	it('skips comment posting when disabled', async () => {
		dependencies.inputs.skipComment = true;

		await run(dependencies);

		expect(dependencies.ensureComment).not.toHaveBeenCalled();
		expect(dependencies.actionCore.info).toHaveBeenCalledWith(
			'Skipping comment posting (skip_comment=true)'
		);
	});

	it('skips comment posting without a pull request number', async () => {
		dependencies.inputs.prNumber = undefined;

		await run(dependencies);

		expect(dependencies.ensureComment).not.toHaveBeenCalled();
		expect(dependencies.actionCore.info).toHaveBeenCalledWith(
			'No PR number available, skipping comment'
		);
	});

	it('fails when package or transitive increases exceed the threshold', async () => {
		dependencies.inputs.failOnIncrease = true;
		dependencies.analyzeBundles.mockResolvedValue([
			{
				...mockPackages[0],
				totalDiffPercent: 15,
			},
		]);

		await run(dependencies);

		expect(dependencies.actionCore.setFailed).toHaveBeenCalledWith(
			'Bundle size increased significantly (>10%). Review the changes above.'
		);
	});

	it('reports thrown errors through the action core', async () => {
		dependencies.analyzeBundles.mockRejectedValue(new Error('boom'));

		await run(dependencies);

		expect(dependencies.actionCore.setFailed).toHaveBeenCalledWith('boom');
	});
});
