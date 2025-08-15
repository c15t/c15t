import * as core from '@actions/core';
import type * as github from '@actions/github';
import {
	append,
	authorLogin,
	header,
	hideDetails,
	ignoreEmpty,
	pullRequestNumber,
	repo,
	skipUnchanged,
} from '../config/inputs';
import {
	commentsEqual,
	createComment,
	findPreviousComment,
	getBodyOf,
	updateComment,
} from '../github/pr-comment';

function ensureFirstTimerBanner(body: string): string {
	return body;
}

function requireEffectiveBodyOrThrow(effectiveBody: string): void {
	if (!effectiveBody) {
		throw new Error(
			'Either message/path input is required or Vercel inputs must be set'
		);
	}
}

async function createInitialCommentWhenMissing(
	octokit: ReturnType<typeof github.getOctokit>,
	previous: unknown,
	effectiveBody: string
): Promise<boolean> {
	if (previous) {
		return false;
	}
	const created = await createComment(
		octokit,
		repo,
		pullRequestNumber,
		effectiveBody ? ensureFirstTimerBanner(effectiveBody) : '',
		header
	);
	core.setOutput('created_comment_id', created?.data.id);
	return true;
}

function handleSkipUnchanged(
	effectiveBody: string,
	previousBodyRaw: string | undefined
): boolean {
	return (
		skipUnchanged &&
		commentsEqual(effectiveBody || '', previousBodyRaw || '', header)
	);
}

async function updateExistingComment(
	octokit: ReturnType<typeof github.getOctokit>,
	previousId: string,
	effectiveBody: string,
	previousBody: string | undefined
): Promise<void> {
	await updateComment(
		octokit,
		previousId,
		effectiveBody ? ensureFirstTimerBanner(effectiveBody) : '',
		header,
		previousBody
	);
}

export async function ensureComment(
	octokit: ReturnType<typeof github.getOctokit>,
	effectiveBody: string
): Promise<void> {
	if (!effectiveBody && ignoreEmpty) {
		core.info('no body given: skip step by ignoreEmpty');
		return;
	}
	requireEffectiveBodyOrThrow(effectiveBody);

	const previous = await findPreviousComment(
		octokit,
		repo,
		pullRequestNumber,
		header,
		authorLogin || undefined
	);
	core.setOutput('previous_comment_id', previous?.id);
	if (await createInitialCommentWhenMissing(octokit, previous, effectiveBody)) {
		return;
	}
	if (handleSkipUnchanged(effectiveBody, previous?.body || '')) {
		return;
	}
	const previousBody = getBodyOf(
		{ body: previous?.body || '' },
		append,
		hideDetails
	);
	if (!previous?.id) {
		return;
	}
	await updateExistingComment(
		octokit,
		previous.id,
		effectiveBody,
		previousBody
	);
}
