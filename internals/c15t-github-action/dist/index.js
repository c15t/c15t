'use strict';
var __webpack_exports__ = {};
const core_namespaceObject = require('@actions/core');
const github_namespaceObject = require('@actions/github');
function headerComment(header) {
	return `<!-- Sticky Pull Request Comment${header} -->`;
}
function bodyWithHeader(body, header) {
	return `${body}\n${headerComment(header)}`;
}
function bodyWithoutHeader(body, header) {
	return body.replace(`\n${headerComment(header)}`, '');
}
async function findPreviousComment(octokit, repo, number, header, authorLogin) {
	let after = null;
	let hasNextPage = true;
	const h = headerComment(header);
	while (hasNextPage) {
		const data = await octokit.graphql(
			`
      query($repo: String! $owner: String! $number: Int! $after: String) {
        viewer { login }
        repository(name: $repo owner: $owner) {
          pullRequest(number: $number) {
            comments(first: 100 after: $after) {
              nodes {
                id
                author {
                  login
                }
                isMinimized
                body
              }
              pageInfo {
                endCursor
                hasNextPage
              }
            }
          }
        }
      }
      `,
			{
				...repo,
				after,
				number,
			}
		);
		const viewer = data.viewer;
		const repository = data.repository;
		const normalizeLogin = (login) =>
			(login ?? '').replace('[bot]', '').trim().toLowerCase();
		const expectedLogin = normalizeLogin(authorLogin ?? viewer.login);
		const target = repository.pullRequest?.comments?.nodes?.find(
			(node) =>
				normalizeLogin(node?.author?.login) === expectedLogin &&
				!node?.isMinimized &&
				node?.body?.includes(h)
		);
		if (target) return target;
		after = repository.pullRequest?.comments?.pageInfo?.endCursor;
		hasNextPage =
			repository.pullRequest?.comments?.pageInfo?.hasNextPage ?? false;
	}
}
async function updateComment(octokit, id, body, header, previousBody) {
	if (!body && !previousBody)
		return core_namespaceObject.warning('Comment body cannot be blank');
	const rawPreviousBody = previousBody
		? bodyWithoutHeader(previousBody, header)
		: '';
	await octokit.graphql(
		`
    mutation($input: UpdateIssueCommentInput!) {
      updateIssueComment(input: $input) {
        issueComment {
          id
          body
        }
      }
    }
    `,
		{
			input: {
				id,
				body: previousBody
					? bodyWithHeader(`${rawPreviousBody}\n${body}`, header)
					: bodyWithHeader(body, header),
			},
		}
	);
}
async function createComment(
	octokit,
	repo,
	issue_number,
	body,
	header,
	previousBody
) {
	if (!body && !previousBody)
		return void core_namespaceObject.warning('Comment body cannot be blank');
	return await octokit.rest.issues.createComment({
		...repo,
		issue_number,
		body: previousBody
			? `${previousBody}\n${body}`
			: bodyWithHeader(body, header),
	});
}
async function deleteComment(octokit, id) {
	await octokit.graphql(
		`
    mutation($id: ID!) {
      deleteIssueComment(input: { id: $id }) {
        clientMutationId
      }
    }
    `,
		{
			id,
		}
	);
}
async function minimizeComment(octokit, subjectId, classifier) {
	await octokit.graphql(
		`
    mutation($input: MinimizeCommentInput!) {
      minimizeComment(input: $input) {
        clientMutationId
      }
    }
    `,
		{
			input: {
				subjectId,
				classifier,
			},
		}
	);
}
function getBodyOf(previous, append, hideDetails) {
	if (!append) return;
	if (!hideDetails || !previous.body) return previous.body;
	return previous.body.replace(/(<details.*?)\s*\bopen\b(.*>)/g, '$1$2');
}
function commentsEqual(body, previous, header) {
	const newBody = bodyWithHeader(body, header);
	return newBody === previous;
}
const external_node_fs_namespaceObject = require('node:fs');
const glob_namespaceObject = require('@actions/glob');
const pullRequestNumber =
	github_namespaceObject.context?.payload?.pull_request?.number ||
	+core_namespaceObject.getInput('number', {
		required: false,
	});
const config_repo = buildRepo();
const config_header = core_namespaceObject.getInput('header', {
	required: false,
});
const config_append = core_namespaceObject.getBooleanInput('append', {
	required: true,
});
const config_hideDetails = core_namespaceObject.getBooleanInput(
	'hide_details',
	{
		required: true,
	}
);
const recreate = core_namespaceObject.getBooleanInput('recreate', {
	required: true,
});
const hideAndRecreate = core_namespaceObject.getBooleanInput(
	'hide_and_recreate',
	{
		required: true,
	}
);
const hideClassify = core_namespaceObject.getInput('hide_classify', {
	required: true,
});
const deleteOldComment = core_namespaceObject.getBooleanInput('delete', {
	required: true,
});
const onlyCreateComment = core_namespaceObject.getBooleanInput('only_create', {
	required: true,
});
const onlyUpdateComment = core_namespaceObject.getBooleanInput('only_update', {
	required: true,
});
const skipUnchanged = core_namespaceObject.getBooleanInput('skip_unchanged', {
	required: true,
});
const hideOldComment = core_namespaceObject.getBooleanInput('hide', {
	required: true,
});
const githubToken = core_namespaceObject.getInput('GITHUB_TOKEN', {
	required: true,
});
const ignoreEmpty = core_namespaceObject.getBooleanInput('ignore_empty', {
	required: true,
});
const config_authorLogin =
	core_namespaceObject.getInput('author_login', {
		required: false,
	}) || 'consentdotio';
function buildRepo() {
	return {
		owner:
			core_namespaceObject.getInput('owner', {
				required: false,
			}) || github_namespaceObject.context.repo.owner,
		repo:
			core_namespaceObject.getInput('repo', {
				required: false,
			}) || github_namespaceObject.context.repo.repo,
	};
}
async function getBody() {
	const pathInput = core_namespaceObject.getMultilineInput('path', {
		required: false,
	});
	const followSymbolicLinks = core_namespaceObject.getBooleanInput(
		'follow_symbolic_links',
		{
			required: true,
		}
	);
	if (!pathInput || !(pathInput.length > 0))
		return core_namespaceObject.getInput('message', {
			required: false,
		});
	try {
		const globber = await (0, glob_namespaceObject.create)(
			pathInput.join('\n'),
			{
				followSymbolicLinks,
				matchDirectories: false,
			}
		);
		return (await globber.glob())
			.map((path) =>
				(0, external_node_fs_namespaceObject.readFileSync)(path, 'utf-8')
			)
			.join('\n');
	} catch (error) {
		if (error instanceof Error) core_namespaceObject.setFailed(error.message);
		return '';
	}
}
async function run() {
	if (Number.isNaN(pullRequestNumber) || pullRequestNumber < 1)
		return void core_namespaceObject.info(
			'no pull request numbers given: skip step'
		);
	try {
		const body = await getBody();
		if (!body && ignoreEmpty)
			return void core_namespaceObject.info(
				'no body given: skip step by ignoreEmpty'
			);
		if (!deleteOldComment && !hideOldComment && !body)
			throw new Error('Either message or path input is required');
		if (deleteOldComment && recreate)
			throw new Error('delete and recreate cannot be both set to true');
		if (onlyCreateComment && onlyUpdateComment)
			throw new Error('only_create and only_update cannot be both set to true');
		if (hideOldComment && hideAndRecreate)
			throw new Error('hide and hide_and_recreate cannot be both set to true');
		const octokit = github_namespaceObject.getOctokit(githubToken);
		const previous = await findPreviousComment(
			octokit,
			config_repo,
			pullRequestNumber,
			config_header,
			config_authorLogin || void 0
		);
		core_namespaceObject.setOutput('previous_comment_id', previous?.id);
		if (deleteOldComment) {
			if (previous) await deleteComment(octokit, previous.id);
			return;
		}
		if (!previous) {
			if (onlyUpdateComment) return;
			const created = await createComment(
				octokit,
				config_repo,
				pullRequestNumber,
				body,
				config_header
			);
			core_namespaceObject.setOutput('created_comment_id', created?.data.id);
			return;
		}
		if (onlyCreateComment) return;
		if (hideOldComment)
			return void (await minimizeComment(octokit, previous.id, hideClassify));
		if (
			skipUnchanged &&
			commentsEqual(body, previous.body || '', config_header)
		)
			return;
		const previousBody = getBodyOf(
			{
				body: previous.body || '',
			},
			config_append,
			config_hideDetails
		);
		if (recreate) {
			await deleteComment(octokit, previous.id);
			const created = await createComment(
				octokit,
				config_repo,
				pullRequestNumber,
				body,
				config_header,
				previousBody
			);
			core_namespaceObject.setOutput('created_comment_id', created?.data.id);
			return;
		}
		if (hideAndRecreate) {
			await minimizeComment(octokit, previous.id, hideClassify);
			const created = await createComment(
				octokit,
				config_repo,
				pullRequestNumber,
				body,
				config_header
			);
			core_namespaceObject.setOutput('created_comment_id', created?.data.id);
			return;
		}
		await updateComment(
			octokit,
			previous.id,
			body,
			config_header,
			previousBody
		);
	} catch (error) {
		if (error instanceof Error) core_namespaceObject.setFailed(error.message);
	}
}
run();
for (var __webpack_i__ in __webpack_exports__)
	exports[__webpack_i__] = __webpack_exports__[__webpack_i__];
Object.defineProperty(exports, '__esModule', {
	value: true,
});
