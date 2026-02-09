/**
 * Detection module exports
 */

// Framework detection
export {
	detectFramework,
	detectProjectRoot,
	getFrameworkDisplayName,
	getRecommendedPackage,
	isNextJs,
	isReactBased,
} from './framework';
// Layout detection
export {
	findLayoutFile,
	getComponentsDirectory,
	getProvidersDirectory,
	isAppRouter,
	isPagesRouter,
} from './layout';
// Package manager detection
export {
	detectPackageManager,
	getExecCommand,
	getInstallCommand,
	getRunCommand,
	isPackageInstalled,
} from './package-manager';
