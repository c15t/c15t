/**
 * Utility module exports
 */

// Formatting
export {
	camelCase,
	capitalize,
	dedent,
	type FormatOptions,
	formatCode,
	formatCss,
	formatJson,
	formatTypeScript,
	indent,
	kebabCase,
	pascalCase,
	snakeCase,
} from './formatter';
// File system
export {
	basename,
	copyFile,
	dirname,
	exists,
	extname,
	findFiles,
	isDirectory,
	isFile,
	joinPath,
	mkdir,
	readDir,
	readFile,
	readJson,
	relativePath,
	remove,
	resolvePath,
	writeFile,
	writeJson,
} from './fs';

// Spinner and progress
export {
	createProgressBar,
	createStepIndicator,
	createTaskGroup,
	createTaskSpinner,
	type ProgressBar,
	type StepIndicator,
	type TaskGroup,
	type TaskSpinner,
	withTaskSpinner,
} from './spinner';
// Validation
export {
	createValidator,
	extractDynamicSegment,
	hasDynamicSegment,
	isNotEmpty,
	isValidC15tUrl,
	isValidEmail,
	isValidInstanceName,
	isValidPackageName,
	isValidSemver,
	isValidUrl,
	normalizeUrl,
	sanitizeIdentifier,
	validateC15tUrl,
	validateInstanceName,
	validateRequired,
	validateUrl,
} from './validation';
