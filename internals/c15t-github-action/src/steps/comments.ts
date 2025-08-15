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

// removed no-op ensureFirstTimerBanner

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
	effectiveBody: string,
	prNumber: number
): Promise<boolean> {
	if (previous) {
		return false;
	}
	const created = await createComment(
		octokit,
		repo,
		prNumber,
		effectiveBody,
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
	await updateComment(octokit, previousId, effectiveBody, header, previousBody);
}

const AUTO_COMMENT_START =
	'<!-- This is an auto-generated comment: c15t docs preview -->';
const AUTO_COMMENT_END =
	'<!-- end of auto-generated comment: c15t docs preview -->';

export async function ensureComment(
	octokit: ReturnType<typeof github.getOctokit>,
	effectiveBody: string,
	options?: { appendOverride?: boolean; hideDetailsOverride?: boolean }
): Promise<void> {
	if (!effectiveBody && ignoreEmpty) {
		core.info('no body given: skip step by ignoreEmpty');
		return;
	}
	requireEffectiveBodyOrThrow(effectiveBody);

	const prNumber =
		typeof pullRequestNumber === 'number' ? pullRequestNumber : 0;

	const previous = await findPreviousComment(
		octokit,
		repo,
		prNumber,
		header,
		authorLogin || undefined
	);
	core.setOutput('previous_comment_id', previous?.id);
	if (
		await createInitialCommentWhenMissing(
			octokit,
			previous,
			effectiveBody,
			prNumber
		)
	) {
		return;
	}
	if (handleSkipUnchanged(effectiveBody, previous?.body || '')) {
		return;
	}
	let shouldAppend =
		typeof options?.appendOverride === 'boolean'
			? options.appendOverride
			: append;
	const shouldHideDetails =
		typeof options?.hideDetailsOverride === 'boolean'
			? options.hideDetailsOverride
			: hideDetails;

	// Migration: if previous body doesn't have the new auto-generated block, replace instead of append
	const previousHasAutoBlock = Boolean(
		previous?.body?.includes(AUTO_COMMENT_START) &&
			previous?.body?.includes(AUTO_COMMENT_END)
	);
	if (shouldAppend && !previousHasAutoBlock) {
		shouldAppend = false;
	}
	const previousBody = getBodyOf(
		{ body: previous?.body || '' },
		shouldAppend,
		shouldHideDetails
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
