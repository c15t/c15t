import type {
	AvailablePackages,
	DevelopmentEnvironment,
} from '~/context/framework-detection';

/** Environment prefix supported by the detected application's bundler. */
export const getEnvVarPrefix = function getEnvVarPrefix(
	pkg: AvailablePackages,
	environment?: DevelopmentEnvironment
): string {
	if (pkg === 'c15t/next') {
		return 'NEXT_PUBLIC';
	}
	if (environment === 'vite') {
		return 'VITE';
	}
	if (pkg === 'c15t/react') {
		return 'REACT_APP';
	}
	return 'PUBLIC';
};

/**
 * Gets the appropriate environment variable name based on package type
 *
 * @param pkg - The package type being used
 * @returns The environment variable name to use
 */
export const getEnvVarName = function getEnvVarName(
	pkg: AvailablePackages,
	developmentEnvironment?: DevelopmentEnvironment
): string {
	return `${getEnvVarPrefix(pkg, developmentEnvironment)}_C15T_URL`;
};

/**
 * Generates environment file content with the c15t backend URL
 *
 * @param backendURL - The backend URL to use
 * @param pkg - The package type being used
 * @returns The generated environment file content
 */
export const generateEnvFileContent = function generateEnvFileContent(
	backendURL: string,
	pkg: AvailablePackages,
	developmentEnvironment?: DevelopmentEnvironment
): string {
	const envVarName = getEnvVarName(pkg, developmentEnvironment);
	return `\n${envVarName}=${backendURL}\n`;
};

/**
 * Generates example environment file content
 *
 * @param pkg - The package type being used
 * @returns The generated example environment file content
 */
export const generateEnvExampleContent = function generateEnvExampleContent(
	pkg: AvailablePackages,
	developmentEnvironment?: DevelopmentEnvironment
): string {
	const envVarName = getEnvVarName(pkg, developmentEnvironment);
	return `\n# c15t Configuration\n${envVarName}=https://your-project.inth.app\n`;
};
