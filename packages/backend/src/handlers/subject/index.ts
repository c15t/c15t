/**
 * Subject handlers exports.
 *
 * @packageDocumentation
 */

import { getSubject } from './get.handler';
import { listSubjects } from './list.handler';
import { patchSubject } from './patch.handler';
import { postSubject } from './post.handler';

export const subjectHandlers = {
	post: postSubject,
	get: getSubject,
	patch: patchSubject,
	list: listSubjects,
};
