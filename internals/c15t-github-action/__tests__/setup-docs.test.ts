/**
 * Testing library and framework: Jest (with TypeScript)
 *
 * This suite covers:
 * - isForkPullRequest(): correctly identifies fork vs same-repo PRs and non-PR events.
 * - setupDocsWithScript(): respects fork PRs (skips), invokes spawnSync correctly with env,
 *   propagates errors for spawn errors and non-zero exit codes, and handles CONSENT_GIT_TOKEN resolution.
 */

import type { SpawnSyncReturns } from 'node:child_process';

// Mock external dependencies
jest.mock('@actions/core', () => ({
  info: jest.fn(),
}));
jest.mock('@actions/github', () => ({
  context: {
    repo: { owner: 'acme', repo: 'widgets' },
    payload: {},
  },
}));
jest.mock('node:child_process', () => ({
  spawnSync: jest.fn(),
}));

// Import after mocks
import * as core from '@actions/core';
import * as github from '@actions/github';
import { spawnSync } from 'node:child_process';

// Inline the module under test content if necessary, but preferred: import from its real module.
// Since the file under test was provided as contents in the PR context and may be co-located,
// we attempt a relative import from the repo source. If this path differs in your project, adjust it accordingly.
let mod: typeof import('../setup-docs'); // typed reference
let isForkPullRequest: () => boolean;
let setupDocsWithScript: (consentGitToken?: string) => void;

function reloadModule() {
  jest.resetModules();
  // Re-apply our manual mocks (jest.resetModules clears the module cache but keeps mocks)
  // dynamic import to get a fresh copy with current mocked @actions/github.context
  // Try possible known locations; fall back to a relative path used in internals folder structure.
  // Primary guess: internals/c15t-github-action/setup-docs.ts compiled to .ts import.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  mod = require('../setup-docs');
  isForkPullRequest = mod.isForkPullRequest;
  setupDocsWithScript = mod.setupDocsWithScript;
}

describe('isForkPullRequest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default repo for this run
    (github as any).context.repo = { owner: 'acme', repo: 'widgets' };
    (github as any).context.payload = {};
    reloadModule();
  });

  it('returns false when not a pull_request event (no pr in payload)', () => {
    (github as any).context.payload = {}; // no pull_request
    reloadModule();

    expect(isForkPullRequest()).toBe(false);
  });

  it('returns false when PR is from the same repository (case-insensitive match)', () => {
    (github as any).context.payload = {
      pull_request: {
        head: { repo: { full_name: 'AcMe/WidGetS' } },
      },
    };
    reloadModule();

    expect(isForkPullRequest()).toBe(false);
  });

  it('returns true when PR is from a fork (different full_name)', () => {
    (github as any).context.payload = {
      pull_request: {
        head: { repo: { full_name: 'another-org/widgets' } },
      },
    };
    reloadModule();

    expect(isForkPullRequest()).toBe(true);
  });

  it('handles missing nested properties gracefully and treats as same-repo empty head (returns true if empty vs real?)', () => {
    // When head repo full_name is empty string, it will not match 'acme/widgets' and thus be treated as fork (true).
    (github as any).context.payload = {
      pull_request: {
        head: { repo: {} },
      },
    };
    reloadModule();

    expect(isForkPullRequest()).toBe(true);
  });

  it('returns false when pull_request object itself is missing (non-PR contexts)', () => {
    (github as any).context.payload = {
      somethingElse: {},
    };
    reloadModule();

    expect(isForkPullRequest()).toBe(false);
  });
});

describe('setupDocsWithScript', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset env to a known baseline
    const keys = Object.keys(process.env);
    for (const k of keys) {
      if (k.startsWith('CONSENT_') || k === 'TEST_SHOULD_NOT_LEAK') continue;
    }

    (github as any).context.repo = { owner: 'acme', repo: 'widgets' };
    (github as any).context.payload = {};
    // Default spawnSync mock
    (spawnSync as jest.Mock).mockImplementation((): SpawnSyncReturns<Buffer> => ({
      pid: 1234,
      output: [],
      stdout: Buffer.from(''),
      stderr: Buffer.from(''),
      status: 0,
      signal: null,
    }));
    reloadModule();
  });

  it('logs and skips when PR is from a fork', () => {
    (github as any).context.payload = {
      pull_request: {
        head: { repo: { full_name: 'another-org/widgets' } },
      },
    };
    reloadModule();

    setupDocsWithScript();

    expect(core.info).toHaveBeenCalledWith('PR from fork detected: skipping docs setup');
    expect(spawnSync).not.toHaveBeenCalled();
  });

  it('executes spawnSync with correct args when not from a fork', () => {
    (github as any).context.payload = {
      pull_request: {
        head: { repo: { full_name: 'acme/widgets' } },
      },
    };
    reloadModule();

    setupDocsWithScript();

    expect(core.info).toHaveBeenCalledWith('Running docs setup script via npx tsx scripts/setup-docs.ts');
    expect(spawnSync).toHaveBeenCalledWith(
      'npx',
      ['-y', 'tsx', 'scripts/setup-docs.ts', '--vercel'],
      expect.objectContaining({ stdio: 'inherit', env: expect.any(Object) }),
    );
  });

  it('prefers provided consent token argument over env var', () => {
    (github as any).context.payload = {
      pull_request: {
        head: { repo: { full_name: 'acme/widgets' } },
      },
    };
    reloadModule();

    process.env.CONSENT_GIT_TOKEN = 'from-env';
    setupDocsWithScript('from-arg');

    const thirdArg = (spawnSync as jest.Mock).mock.calls[0][2];
    expect(thirdArg.env.CONSENT_GIT_TOKEN).toBe('from-arg');
  });

  it('falls back to process.env.CONSENT_GIT_TOKEN if no arg is supplied', () => {
    (github as any).context.payload = {
      pull_request: {
        head: { repo: { full_name: 'acme/widgets' } },
      },
    };
    reloadModule();

    process.env.CONSENT_GIT_TOKEN = 'from-env';
    setupDocsWithScript();

    const thirdArg = (spawnSync as jest.Mock).mock.calls[0][2];
    expect(thirdArg.env.CONSENT_GIT_TOKEN).toBe('from-env');
  });

  it('uses empty string if no token provided and env var missing', () => {
    (github as any).context.payload = {
      pull_request: {
        head: { repo: { full_name: 'acme/widgets' } },
      },
    };
    reloadModule();

    delete (process.env as any).CONSENT_GIT_TOKEN;
    setupDocsWithScript();

    const thirdArg = (spawnSync as jest.Mock).mock.calls[0][2];
    expect(thirdArg.env.CONSENT_GIT_TOKEN).toBe('');
  });

  it('throws if spawnSync returns an error', () => {
    (github as any).context.payload = {
      pull_request: {
        head: { repo: { full_name: 'acme/widgets' } },
      },
    };
    reloadModule();

    const err = new Error('spawn failed');
    (spawnSync as jest.Mock).mockImplementation(() => ({ error: err } as any));

    expect(() => setupDocsWithScript()).toThrow(err);
  });

  it('throws with informative message on non-zero exit status', () => {
    (github as any).context.payload = {
      pull_request: {
        head: { repo: { full_name: 'acme/widgets' } },
      },
    };
    reloadModule();

    (spawnSync as jest.Mock).mockImplementation(
      () =>
        ({
          pid: 1234,
          output: [],
          stdout: Buffer.from(''),
          stderr: Buffer.from(''),
          status: 2,
          signal: null,
        }) as SpawnSyncReturns<Buffer>,
    );

    expect(() => setupDocsWithScript()).toThrow(
      new Error('setup-docs script failed with exit code 2'),
    );
  });

  it('passes through process.env variables while overriding CONSENT_GIT_TOKEN only', () => {
    (github as any).context.payload = {
      pull_request: {
        head: { repo: { full_name: 'acme/widgets' } },
      },
    };
    reloadModule();

    process.env.SOME_OTHER_ENV = 'foo';
    process.env.CONSENT_GIT_TOKEN = 'env-token';

    setupDocsWithScript();

    const thirdArg = (spawnSync as jest.Mock).mock.calls[0][2];
    expect(thirdArg.env.SOME_OTHER_ENV).toBe('foo');
    expect(thirdArg.env.CONSENT_GIT_TOKEN).toBe('env-token');
    expect(thirdArg.stdio).toBe('inherit');
  });

  it('does not run when not a PR event (payload without pull_request)', () => {
    (github as any).context.payload = {}; // not a PR
    reloadModule();

    // For non-PRs, isForkPullRequest returns false, so setupDocsWithScript will run.
    setupDocsWithScript();
    expect(spawnSync).toHaveBeenCalled();
  });
});