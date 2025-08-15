import * as core from '@actions/core';
import type * as github from '@actions/github';
import {
	append,
	authorLogin,
	deleteOldComment,
	header,
	hideAndRecreate,
	hideClassify,
	hideDetails,
	hideOldComment,
	ignoreEmpty,
	onlyCreateComment,
	onlyUpdateComment,
	pullRequestNumber,
	recreate,
	repo,
	skipUnchanged,
} from '../config/inputs';
import {
	commentsEqual,
	createComment,
	deleteComment,
	findPreviousComment,
	getBodyOf,
	minimizeComment,
	updateComment,
} from '../github/pr-comment';

function ensureFirstTimerBanner(body: string): string {
	return body;
}

export function requireEffectiveBodyOrThrow(effectiveBody: string): void {
	if (!hideOldComment && !effectiveBody) {
		throw new Error(
			'Either message/path input is required or Vercel inputs must be set'
		);
	}
}

export async function handleDeleteOldComment(
	octokit: ReturnType<typeof github.getOctokit>,
	previous: { id: string } | undefined
): Promise<boolean> {
	if (!previous) {
		return false;
	}
	await deleteComment(octokit, previous.id);
	return true;
}

export function handleOnlyUpdateWhenNoPrevious(previous: unknown): boolean {
	return !previous && onlyUpdateComment;
}

export async function createInitialCommentWhenMissing(
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

export function handleOnlyCreateWhenExisting(): boolean {
	return Boolean(onlyCreateComment);
}

export async function handleHideOld(
	octokit: ReturnType<typeof github.getOctokit>,
	previous: { id: string } | undefined
): Promise<boolean> {
	if (!hideOldComment || !previous) {
		return false;
	}
	await minimizeComment(octokit, previous.id, hideClassify);
	return true;
}

export function handleSkipUnchanged(
	effectiveBody: string,
	previousBodyRaw: string | undefined
): boolean {
	return (
		skipUnchanged &&
		commentsEqual(effectiveBody || '', previousBodyRaw || '', header)
	);
}

export async function handleRecreate(
	octokit: ReturnType<typeof github.getOctokit>,
	previous: { id: string } | undefined,
	effectiveBody: string,
	previousBody: string | undefined
): Promise<boolean> {
	if (!previous) {
		return false;
	}
	await deleteComment(octokit, previous.id);
	const created = await createComment(
		octokit,
		repo,
		pullRequestNumber,
		effectiveBody ? ensureFirstTimerBanner(effectiveBody) : '',
		header,
		previousBody
	);
	core.setOutput('created_comment_id', created?.data.id);
	return true;
}

export async function handleHideAndRecreate(
	octokit: ReturnType<typeof github.getOctokit>,
	previous: { id: string } | undefined,
	effectiveBody: string
): Promise<boolean> {
	if (!hideAndRecreate || !previous) {
		return false;
	}
	await minimizeComment(octokit, previous.id, hideClassify);
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

export async function updateExistingComment(
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

	if (deleteOldComment && (await handleDeleteOldComment(octokit, previous))) {
		return;
	}
	if (handleOnlyUpdateWhenNoPrevious(previous)) {
		return;
	}
	if (await createInitialCommentWhenMissing(octokit, previous, effectiveBody)) {
		return;
	}
	if (onlyCreateComment) {
		return;
	}
	if (await handleHideOld(octokit, previous)) {
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
	if (
		recreate &&
		(await handleRecreate(octokit, previous, effectiveBody, previousBody))
	) {
		return;
	}
	if (await handleHideAndRecreate(octokit, previous, effectiveBody)) {
		return;
	}
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
