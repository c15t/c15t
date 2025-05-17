/**
 * Generates environment file content with the c15t backend URL
 *
 * @param backendURL - The backend URL to use
 * @returns The generated environment file content
 */
export function generateEnvFileContent(backendURL: string): string {
	return `# c15t Configuration
# Note: This URL is public and can be safely committed to version control
NEXT_PUBLIC_C15T_URL=${backendURL}
`;
}
