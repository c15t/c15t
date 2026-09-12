import path from 'node:path';

import * as p from '@clack/prompts';
import color from 'picocolors';

import type { CliContext } from '~/context/types';
import { CliError } from '~/core/errors';
import {
	runPackageManagerInstall as addAndInstallDependenciesViaPM,
	getManualInstallCommand,
} from '~/machines/generate/actors/dependencies';
import { TelemetryEventName } from '~/utils/telemetry';

export { addAndInstallDependenciesViaPM, getManualInstallCommand };

interface InstallDependenciesOptions {
	context: CliContext;
	dependenciesToAdd: string[];
	handleCancel?: (value: unknown) => boolean;
	autoInstall?: boolean;
}

export const installDependencies = async function installDependencies({
	context,
	dependenciesToAdd,
	handleCancel,
	autoInstall = false,
}: InstallDependenciesOptions) {
	const { telemetry, logger } = context;
	const s = context.flags.json
		? {
				start: (message: string) => logger.debug(message),
				stop: (message: string) => logger.debug(message),
			}
		: p.spinner();

	if (dependenciesToAdd.length === 0) {
		return { installDepsConfirmed: false, ranInstall: false };
	}

	const depsString = dependenciesToAdd.map((d) => color.cyan(d)).join(', ');

	if (!autoInstall && context.flags.yes !== true) {
		if (context.flags['non-interactive']) {
			throw new CliError('INPUT_REQUIRED', {
				details:
					'Dependency installation requires --yes in noninteractive mode.',
			});
		}
		const addDepsSelection = await p.confirm({
			initialValue: true,
			message: `Add required dependencies using ${color.cyan(context.packageManager.name)}? (${depsString})`,
		});

		if (handleCancel?.(addDepsSelection)) {
			return { installDepsConfirmed: false, ranInstall: false };
		}

		if (!addDepsSelection) {
			return { installDepsConfirmed: false, ranInstall: false };
		}
	}

	s.start(
		`Running ${color.cyan(context.packageManager.name)} to add and install dependencies... (this might take a moment)`
	);
	try {
		await addAndInstallDependenciesViaPM(
			context.projectRoot,
			dependenciesToAdd,
			context.packageManager.name
		);
		s.stop(
			`✅ Dependencies installed: ${dependenciesToAdd.map((d) => color.cyan(d)).join(', ')}`
		);
		telemetry.trackEvent(TelemetryEventName.ONBOARDING_DEPENDENCIES_INSTALLED, {
			dependencies: dependenciesToAdd.join(','),
			packageManager: context.packageManager.name,
			success: true,
		});

		return { installDepsConfirmed: true, ranInstall: true };
	} catch (installError) {
		s.stop(color.yellow('⚠️ Dependency installation failed.'));
		logger.error('Installation Error:', installError);
		telemetry.trackEvent(TelemetryEventName.ONBOARDING_DEPENDENCIES_INSTALLED, {
			dependencies: dependenciesToAdd.join(','),
			error:
				installError instanceof Error
					? installError.message
					: String(installError),
			packageManager: context.packageManager.name,
			success: false,
		});
		const pmCommand = getManualInstallCommand(
			dependenciesToAdd,
			context.packageManager.name
		);
		logger.info(
			`Please try running '${pmCommand}' manually in ${color.cyan(path.relative(context.cwd, context.projectRoot))}.`
		);
		return { installDepsConfirmed: true, ranInstall: false };
	}
};
