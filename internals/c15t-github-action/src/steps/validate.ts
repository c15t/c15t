import {
	deleteOldComment,
	hideAndRecreate,
	onlyCreateComment,
	onlyUpdateComment,
	recreate,
} from '../config/inputs';

export function validateOptions(): void {
	if (deleteOldComment && recreate) {
		throw new Error('delete and recreate cannot be both set to true');
	}
	if (onlyCreateComment && onlyUpdateComment) {
		throw new Error('only_create and only_update cannot be both set to true');
	}
	if (hideAndRecreate && hideAndRecreate) {
		throw new Error('hide and hide_and_recreate cannot be both set to true');
	}
}
