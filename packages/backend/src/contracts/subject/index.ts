/**
 * Subject contracts exports.
 *
 * @packageDocumentation
 */

import { getSubjectContract } from './get.contract';
import { listSubjectsContract } from './list.contract';
import { patchSubjectContract } from './patch.contract';
import { postSubjectContract } from './post.contract';

export const subjectContracts = {
	post: postSubjectContract,
	get: getSubjectContract,
	patch: patchSubjectContract,
	list: listSubjectsContract,
};

export * from './schemas';
