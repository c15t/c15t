import type { AvailiblePackages } from '../detection';

/**
 * Gets the appropriate environment variable name based on package type
 *
 * @param pkg - The package type being used
 * @returns The environment variable name to use
 */
export function getEnvVarName(pkg: AvailiblePackages): string {
	return pkg === '@c15t/nextjs' ? 'NEXT_PUBLIC_C15T_URL' : 'PUBLIC_C15T_URL';
}

/**
 * Generates environment file content with the c15t backend URL
 *
 * @param backendURL - The backend URL to use
 * @param pkg - The package type being used
 * @returns The generated environment file content
 */
export function generateEnvFileContent(
	backendURL: string,
	pkg: AvailiblePackages
): string {
	const envVarName = getEnvVarName(pkg);
	return `\n${envVarName}=${backendURL}\n`;
}

/**
 * Generates example environment file content
 *
 * @param pkg - The package type being used
 * @returns The generated example environment file content
 */
export function generateEnvExampleContent(pkg: AvailiblePackages): string {
	const envVarName = getEnvVarName(pkg);
	return `\n# c15t Configuration\n${envVarName}=https://your-instance.c15t.dev\n`;
}
