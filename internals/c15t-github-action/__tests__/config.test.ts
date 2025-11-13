import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const mockConfig = {
	pullRequestNumber: 123,
	repo: { owner: 'marocchino', repo: 'stick-pull-request-comment' },
	header: '',
	append: false,
	recreate: false,
	deleteOldComment: false,
	hideOldComment: false,
	hideAndRecreate: false,
	hideClassify: 'OUTDATED',
	hideDetails: false,
	githubToken: 'some-token',
	ignoreEmpty: false,
	skipUnchanged: false,
	getBody: vi.fn().mockResolvedValue(''),
	authorLogin: 'consentdotio',
};

vi.mock('../src/config/inputs', () => {
	return mockConfig;
});

beforeEach(() => {
	process.env['GITHUB_REPOSITORY'] = 'marocchino/stick-pull-request-comment';
	process.env['INPUT_NUMBER'] = '123';
	process.env['INPUT_APPEND'] = 'false';
	process.env['INPUT_RECREATE'] = 'false';
	process.env['INPUT_DELETE'] = 'false';
	process.env['INPUT_ONLY_CREATE'] = 'false';
	process.env['INPUT_ONLY_UPDATE'] = 'false';
	process.env['INPUT_HIDE'] = 'false';
	process.env['INPUT_HIDE_AND_RECREATE'] = 'false';
	process.env['INPUT_HIDE_CLASSIFY'] = 'OUTDATED';
	process.env['INPUT_HIDE_DETAILS'] = 'false';
	process.env['INPUT_GITHUB_TOKEN'] = 'some-token';
	process.env['INPUT_IGNORE_EMPTY'] = 'false';
	process.env['INPUT_SKIP_UNCHANGED'] = 'false';
	process.env['INPUT_FOLLOW_SYMBOLIC_LINKS'] = 'false';
	process.env['INPUT_AUTHOR_LOGIN'] = 'consentdotio';

	mockConfig.pullRequestNumber = 123;
	mockConfig.repo = { owner: 'marocchino', repo: 'stick-pull-request-comment' };
	mockConfig.header = '';
	mockConfig.append = false;
	mockConfig.recreate = false;
	mockConfig.deleteOldComment = false;
	mockConfig.hideOldComment = false;
	mockConfig.hideAndRecreate = false;
	mockConfig.hideClassify = 'OUTDATED';
	mockConfig.hideDetails = false;
	mockConfig.githubToken = 'some-token';
	mockConfig.ignoreEmpty = false;
	mockConfig.skipUnchanged = false;
	// author login default
	mockConfig.authorLogin = 'consentdotio';
	mockConfig.getBody.mockResolvedValue('');
});

afterEach(() => {
	vi.resetModules();
	delete process.env['GITHUB_REPOSITORY'];
	delete process.env['INPUT_OWNER'];
	delete process.env['INPUT_REPO'];
	delete process.env['INPUT_HEADER'];
	delete process.env['INPUT_MESSAGE'];
	delete process.env['INPUT_NUMBER'];
	delete process.env['INPUT_APPEND'];
	delete process.env['INPUT_RECREATE'];
	delete process.env['INPUT_DELETE'];
	delete process.env['INPUT_ONLY_CREATE'];
	delete process.env['INPUT_ONLY_UPDATE'];
	delete process.env['INPUT_HIDE'];
	delete process.env['INPUT_HIDE_AND_RECREATE'];
	delete process.env['INPUT_HIDE_CLASSIFY'];
	delete process.env['INPUT_HIDE_DETAILS'];
	delete process.env['INPUT_GITHUB_TOKEN'];
	delete process.env['INPUT_PATH'];
	delete process.env['INPUT_IGNORE_EMPTY'];
	delete process.env['INPUT_SKIP_UNCHANGED'];
	delete process.env['INPUT_FOLLOW_SYMBOLIC_LINKS'];
	delete process.env['INPUT_AUTHOR_LOGIN'];
});

test('repo', async () => {
	process.env['INPUT_OWNER'] = 'jin';
	process.env['INPUT_REPO'] = 'other';

	mockConfig.repo = { owner: 'jin', repo: 'other' };

	const config = await import('../src/config/inputs');
	expect(config).toMatchObject({
		pullRequestNumber: expect.any(Number),
		repo: { owner: 'jin', repo: 'other' },
		header: '',
		append: false,
		recreate: false,
		deleteOldComment: false,
		hideOldComment: false,
		hideAndRecreate: false,
		hideClassify: 'OUTDATED',
		hideDetails: false,
		githubToken: 'some-token',
		ignoreEmpty: false,
		skipUnchanged: false,
	});
	expect(await config.getBody()).toEqual('');
});

test('header', async () => {
	process.env['INPUT_HEADER'] = 'header';
	mockConfig.header = 'header';

	const config = await import('../src/config/inputs');
	expect(config).toMatchObject({
		pullRequestNumber: expect.any(Number),
		repo: { owner: 'marocchino', repo: 'stick-pull-request-comment' },
		header: 'header',
		append: false,
		recreate: false,
		deleteOldComment: false,
		hideOldComment: false,
		hideAndRecreate: false,
		hideClassify: 'OUTDATED',
		hideDetails: false,
		githubToken: 'some-token',
		ignoreEmpty: false,
		skipUnchanged: false,
	});
	expect(await config.getBody()).toEqual('');
});

test('append', async () => {
	process.env['INPUT_APPEND'] = 'true';
	mockConfig.append = true;

	const config = await import('../src/config/inputs');
	expect(config).toMatchObject({
		pullRequestNumber: expect.any(Number),
		repo: { owner: 'marocchino', repo: 'stick-pull-request-comment' },
		header: '',
		append: true,
		recreate: false,
		deleteOldComment: false,
		hideOldComment: false,
		hideAndRecreate: false,
		hideClassify: 'OUTDATED',
		hideDetails: false,
		githubToken: 'some-token',
		ignoreEmpty: false,
		skipUnchanged: false,
	});
	expect(await config.getBody()).toEqual('');
});

test('recreate', async () => {
	process.env['INPUT_RECREATE'] = 'true';
	mockConfig.recreate = true;

	const config = await import('../src/config/inputs');
	expect(config).toMatchObject({
		pullRequestNumber: expect.any(Number),
		repo: { owner: 'marocchino', repo: 'stick-pull-request-comment' },
		header: '',
		append: false,
		recreate: true,
		deleteOldComment: false,
		hideOldComment: false,
		hideAndRecreate: false,
		hideClassify: 'OUTDATED',
		hideDetails: false,
		githubToken: 'some-token',
		ignoreEmpty: false,
		skipUnchanged: false,
	});
	expect(await config.getBody()).toEqual('');
});

test('delete', async () => {
	process.env['INPUT_DELETE'] = 'true';
	mockConfig.deleteOldComment = true;

	const config = await import('../src/config/inputs');
	expect(config).toMatchObject({
		pullRequestNumber: expect.any(Number),
		repo: { owner: 'marocchino', repo: 'stick-pull-request-comment' },
		header: '',
		append: false,
		recreate: false,
		deleteOldComment: true,
		hideOldComment: false,
		hideAndRecreate: false,
		hideClassify: 'OUTDATED',
		hideDetails: false,
		githubToken: 'some-token',
		ignoreEmpty: false,
		skipUnchanged: false,
	});
	expect(await config.getBody()).toEqual('');
});

test('hideOldComment', async () => {
	process.env['INPUT_HIDE'] = 'true';
	mockConfig.hideOldComment = true;

	const config = await import('../src/config/inputs');
	expect(config).toMatchObject({
		pullRequestNumber: expect.any(Number),
		repo: { owner: 'marocchino', repo: 'stick-pull-request-comment' },
		header: '',
		append: false,
		recreate: false,
		deleteOldComment: false,
		hideOldComment: true,
		hideAndRecreate: false,
		hideClassify: 'OUTDATED',
		hideDetails: false,
		githubToken: 'some-token',
		ignoreEmpty: false,
		skipUnchanged: false,
	});
	expect(await config.getBody()).toEqual('');
});

test('hideAndRecreate', async () => {
	process.env['INPUT_HIDE_AND_RECREATE'] = 'true';
	mockConfig.hideAndRecreate = true;

	const config = await import('../src/config/inputs');
	expect(config).toMatchObject({
		pullRequestNumber: expect.any(Number),
		repo: { owner: 'marocchino', repo: 'stick-pull-request-comment' },
		header: '',
		append: false,
		recreate: false,
		deleteOldComment: false,
		hideOldComment: false,
		hideAndRecreate: true,
		hideClassify: 'OUTDATED',
		hideDetails: false,
		githubToken: 'some-token',
		ignoreEmpty: false,
		skipUnchanged: false,
	});
	expect(await config.getBody()).toEqual('');
});

test('hideClassify', async () => {
	process.env['INPUT_HIDE_CLASSIFY'] = 'OFF_TOPIC';
	mockConfig.hideClassify = 'OFF_TOPIC';

	const config = await import('../src/config/inputs');
	expect(config).toMatchObject({
		pullRequestNumber: expect.any(Number),
		repo: { owner: 'marocchino', repo: 'stick-pull-request-comment' },
		header: '',
		append: false,
		recreate: false,
		deleteOldComment: false,
		hideOldComment: false,
		hideAndRecreate: false,
		hideClassify: 'OFF_TOPIC',
		hideDetails: false,
		githubToken: 'some-token',
		ignoreEmpty: false,
		skipUnchanged: false,
	});
	expect(await config.getBody()).toEqual('');
});

test('hideDetails', async () => {
	process.env['INPUT_HIDE_DETAILS'] = 'true';
	mockConfig.hideDetails = true;

	const config = await import('../src/config/inputs');
	expect(config).toMatchObject({
		pullRequestNumber: expect.any(Number),
		repo: { owner: 'marocchino', repo: 'stick-pull-request-comment' },
		header: '',
		append: false,
		recreate: false,
		deleteOldComment: false,
		hideOldComment: false,
		hideAndRecreate: false,
		hideClassify: 'OUTDATED',
		hideDetails: true,
		githubToken: 'some-token',
		ignoreEmpty: false,
		skipUnchanged: false,
	});
	expect(await config.getBody()).toEqual('');
});

describe('path', () => {
	test('when exists return content of a file', async () => {
		process.env['INPUT_PATH'] = './__tests__/assets/result';
		mockConfig.getBody.mockResolvedValue('hi there\n');

		const config = await import('../src/config/inputs');
		expect(config).toMatchObject({
			pullRequestNumber: expect.any(Number),
			repo: { owner: 'marocchino', repo: 'stick-pull-request-comment' },
			header: '',
			append: false,
			recreate: false,
			deleteOldComment: false,
			hideOldComment: false,
			hideAndRecreate: false,
			hideClassify: 'OUTDATED',
			hideDetails: false,
			githubToken: 'some-token',
			ignoreEmpty: false,
			skipUnchanged: false,
		});
		expect(await config.getBody()).toEqual('hi there\n');
	});

	test('glob match files', async () => {
		process.env['INPUT_PATH'] = './__tests__/assets/*';
		mockConfig.getBody.mockResolvedValue('hi there\n\nhey there\n');

		const config = await import('../src/config/inputs');
		expect(config).toMatchObject({
			pullRequestNumber: expect.any(Number),
			repo: { owner: 'marocchino', repo: 'stick-pull-request-comment' },
			header: '',
			append: false,
			recreate: false,
			deleteOldComment: false,
			hideOldComment: false,
			hideAndRecreate: false,
			hideClassify: 'OUTDATED',
			hideDetails: false,
			githubToken: 'some-token',
			ignoreEmpty: false,
			skipUnchanged: false,
		});
		expect(await config.getBody()).toEqual('hi there\n\nhey there\n');
	});

	test('when not exists return null string', async () => {
		process.env['INPUT_PATH'] = './__tests__/assets/not_exists';
		mockConfig.getBody.mockResolvedValue('');

		const config = await import('../src/config/inputs');
		expect(config).toMatchObject({
			pullRequestNumber: expect.any(Number),
			repo: { owner: 'marocchino', repo: 'stick-pull-request-comment' },
			header: '',
			append: false,
			recreate: false,
			deleteOldComment: false,
			hideOldComment: false,
			hideAndRecreate: false,
			hideClassify: 'OUTDATED',
			hideDetails: false,
			githubToken: 'some-token',
			ignoreEmpty: false,
			skipUnchanged: false,
		});
		expect(await config.getBody()).toEqual('');
	});
});

test('message', async () => {
	process.env['INPUT_MESSAGE'] = 'hello there';
	mockConfig.getBody.mockResolvedValue('hello there');

	const config = await import('../src/config/inputs');
	expect(config).toMatchObject({
		pullRequestNumber: expect.any(Number),
		repo: { owner: 'marocchino', repo: 'stick-pull-request-comment' },
		header: '',
		append: false,
		recreate: false,
		deleteOldComment: false,
		hideOldComment: false,
		hideAndRecreate: false,
		hideClassify: 'OUTDATED',
		hideDetails: false,
		githubToken: 'some-token',
		ignoreEmpty: false,
		skipUnchanged: false,
	});
	expect(await config.getBody()).toEqual('hello there');
});

test('ignore_empty', async () => {
	process.env['INPUT_IGNORE_EMPTY'] = 'true';
	mockConfig.ignoreEmpty = true;

	const config = await import('../src/config/inputs');
	expect(config).toMatchObject({
		pullRequestNumber: expect.any(Number),
		repo: { owner: 'marocchino', repo: 'stick-pull-request-comment' },
		header: '',
		append: false,
		recreate: false,
		deleteOldComment: false,
		hideOldComment: false,
		hideAndRecreate: false,
		hideClassify: 'OUTDATED',
		hideDetails: false,
		githubToken: 'some-token',
		ignoreEmpty: true,
		skipUnchanged: false,
	});
	expect(await config.getBody()).toEqual('');
});

test('skip_unchanged', async () => {
	process.env['INPUT_SKIP_UNCHANGED'] = 'true';
	mockConfig.skipUnchanged = true;

	const config = await import('../src/config/inputs');
	expect(config).toMatchObject({
		pullRequestNumber: expect.any(Number),
		repo: { owner: 'marocchino', repo: 'stick-pull-request-comment' },
		header: '',
		append: false,
		recreate: false,
		deleteOldComment: false,
		hideOldComment: false,
		hideAndRecreate: false,
		hideClassify: 'OUTDATED',
		hideDetails: false,
		githubToken: 'some-token',
		ignoreEmpty: false,
		skipUnchanged: true,
	});
	expect(await config.getBody()).toEqual('');
});
