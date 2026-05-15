import type { CliContext } from '~/context/types';
import type { TaskSpinner } from '~/utils/spinner';

export interface BaseResult {
	installDepsConfirmed: boolean;
	ranInstall: boolean;
}

export interface BaseOptions {
	context: CliContext;
	handleCancel?: (value: unknown) => boolean;
	spinner: TaskSpinner;
}
