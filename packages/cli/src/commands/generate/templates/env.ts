import type { AvailablePackages } from '~/context/framework-detection';

/**
 * Gets the appropriate environment variable name based on package type
 *
 * @param pkg - The package type being used
 * @returns The environment variable name to use
 */
export const getEnvVarName = function getEnvVarName(
	pkg: AvailablePackages
): string {
	return pkg === 'c15t/next' ? 'NEXT_PUBLIC_C15T_URL' : 'PUBLIC_C15T_URL';
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
	pkg: AvailablePackages
): string {
	const envVarName = getEnvVarName(pkg);
	return `\n${envVarName}=${backendURL}\n`;
};

/**
 * Generates example environment file content
 *
 * @param pkg - The package type being used
 * @returns The generated example environment file content
 */
export const generateEnvExampleContent = function generateEnvExampleContent(
	pkg: AvailablePackages
): string {
	const envVarName = getEnvVarName(pkg);
	return `\n# c15t Configuration\n${envVarName}=https://your-project.inth.app\n`;
};
