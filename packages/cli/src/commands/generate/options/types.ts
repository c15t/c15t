import type * as p from '@clack/prompts';
import type { AvailablePackages } from '~/context/framework-detection';
import type { CliContext } from '~/context/types';

export interface BaseResult {
	installDepsConfirmed: boolean;
	ranInstall: boolean;
}

export interface BaseOptions {
	context: CliContext;
	handleCancel?: (value: unknown) => boolean;
	spinner: ReturnType<typeof p.spinner>;
}
