import { packageInfo } from '../package-info';
import type { CliContext } from './types';

export const createFileSystem = (
	_context?: Pick<CliContext, 'logger' | 'cwd'>
) => ({
	getPackageInfo: () => ({ ...packageInfo }),
});
