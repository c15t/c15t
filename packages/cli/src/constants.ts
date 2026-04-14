/**
 * Centralized constants for the c15t CLI
 *
 * All magic strings, URLs, and regex patterns should be defined here
 * to maintain consistency and make updates easier.
 */

// --- URLs ---
export const URLS = {
	/** Default c15t cloud platform URL */
	CONSENT_IO: 'https://inth.com',
	/** First-party telemetry logs endpoint */
	TELEMETRY: 'https://telemetry.c15t.com/c15t/v1/logs',
	/** Documentation website */
	DOCS: 'https://v2.c15t.com/docs',
	/** GitHub repository */
	GITHUB: 'https://github.com/c15t/c15t',
	/** Discord community */
	DISCORD: 'https://v2.c15t.com/discord',
	/** API documentation */
	API_DOCS: 'https://v2.c15t.com/docs/api',
	/** CLI documentation */
	CLI_DOCS: 'https://v2.c15t.com/docs/cli',
	/** Product changelog */
	CHANGELOG: 'https://v2.c15t.com/changelog',
} as const;

// --- File Paths ---
export const PATHS = {
	/** c15t config directory name (in home dir) */
	CONFIG_DIR: '.c15t',
	/** Config file name */
	CONFIG_FILE: 'config.json',
	/** Telemetry state file name */
	TELEMETRY_STATE_FILE: 'telemetry.json',
	/** Telemetry retry queue file name */
	TELEMETRY_QUEUE_FILE: 'telemetry-queue.json',
	/** Project config file name */
	PROJECT_CONFIG: 'c15t.config.ts',
	/** Alternative project config file name */
	PROJECT_CONFIG_JS: 'c15t.config.js',
	/** Environment file */
	ENV_FILE: '.env',
	/** Local environment file */
	ENV_LOCAL: '.env.local',
} as const;

// --- Regex Patterns ---
export const REGEX = {
	/** Generic URL pattern */
	URL: /^https?:\/\/.+/,
	/** Hosted c15t platform URL pattern (legacy and current domains) */
	C15T_URL: /^https:\/\/[\w-]+\.(?:c15t\.dev|inth\.app)$/,
	/** Dynamic route segment pattern (e.g., [locale]) */
	DYNAMIC_SEGMENT: /\[[\w-]+\]/,
	/** Semantic version pattern */
	SEMVER: /^\d+\.\d+\.\d+(-[\w.]+)?$/,
	/** Package name pattern */
	PACKAGE_NAME: /^(@[\w-]+\/)?[\w-]+$/,
} as const;

// --- CLI Metadata ---
export const CLI_INFO = {
	/** CLI name */
	NAME: 'c15t',
	/** CLI binary name */
	BIN: 'c15t',
	/** Control-plane client name */
	CONTROL_PLANE_CLIENT_NAME: 'c15t-cli',
	/** Current version (updated during build) */
	VERSION: '2.0.0',
} as const;

// --- Timeouts ---
export const TIMEOUTS = {
	/** Device flow polling interval (seconds) */
	DEVICE_FLOW_POLL_INTERVAL: 5,
	/** Device flow expiration (seconds) */
	DEVICE_FLOW_EXPIRY: 900, // 15 minutes
	/** HTTP request timeout (ms) */
	HTTP_REQUEST: 10000,
	/** Control-plane connection timeout (ms) */
	CONTROL_PLANE_CONNECTION: 30000,
} as const;

// --- Environment Variables ---
export const ENV_VARS = {
	/** Enable v2 feature-flagged behavior */
	V2: 'V2',
	/** Disable telemetry */
	TELEMETRY_DISABLED: 'C15T_TELEMETRY_DISABLED',
	/** Override telemetry ingest endpoint */
	TELEMETRY_ENDPOINT: 'C15T_TELEMETRY_ENDPOINT',
	/** Optional write key for telemetry ingest */
	TELEMETRY_WRITE_KEY: 'C15T_TELEMETRY_WRITE_KEY',
	/** Optional Axiom org ID for telemetry ingest */
	TELEMETRY_ORG_ID: 'C15T_TELEMETRY_ORG_ID',
	/** Control-plane/dashboard base URL override */
	CONSENT_URL: 'CONSENT_URL',
	/** c15t backend URL */
	BACKEND_URL: 'C15T_URL',
	/** c15t API key */
	API_KEY: 'C15T_API_KEY',
	/** Debug mode */
	DEBUG: 'C15T_DEBUG',
} as const;

// --- Storage Mode Options ---
export const STORAGE_MODES = {
	HOSTED: 'hosted',
	/**
	 * @deprecated Use HOSTED instead; remove in v3.0.0.
	 * @see HOSTED
	 */
	C15T: 'c15t',
	OFFLINE: 'offline',
	SELF_HOSTED: 'self-hosted',
	CUSTOM: 'custom',
} as const;

export type StorageMode = (typeof STORAGE_MODES)[keyof typeof STORAGE_MODES];

// --- Package Names ---
export const PACKAGES = {
	CORE: 'c15t',
	REACT: '@c15t/react',
	NEXTJS: '@c15t/nextjs',
	BACKEND: '@c15t/backend',
} as const;

export type AvailablePackage = (typeof PACKAGES)[keyof typeof PACKAGES];

// --- Framework Detection Keys ---
export const FRAMEWORK_KEYS = {
	NEXT: 'next',
	REMIX: '@remix-run/react',
	VITE_REACT: '@vitejs/plugin-react',
	VITE_REACT_SWC: '@vitejs/plugin-react-swc',
	GATSBY: 'gatsby',
	REACT: 'react',
} as const;

// --- Layout File Patterns ---
export const LAYOUT_PATTERNS = [
	// Exact matches (highest priority)
	'app/layout.tsx',
	'app/layout.ts',
	'app/layout.jsx',
	'app/layout.js',
	'src/app/layout.tsx',
	'src/app/layout.ts',
	'src/app/layout.jsx',
	'src/app/layout.js',
	// Dynamic segment matches (locale-based routing)
	'app/*/layout.tsx',
	'app/*/layout.ts',
	'app/*/layout.jsx',
	'app/*/layout.js',
	'src/app/*/layout.tsx',
	'src/app/*/layout.ts',
	'src/app/*/layout.jsx',
	'src/app/*/layout.js',
	// Deeper nesting
	'app/*/*/layout.tsx',
	'app/*/*/layout.ts',
	'src/app/*/*/layout.tsx',
	'src/app/*/*/layout.ts',
] as const;

// --- Pages Router Patterns ---
export const PAGES_APP_PATTERNS = [
	'pages/_app.tsx',
	'pages/_app.ts',
	'pages/_app.jsx',
	'pages/_app.js',
	'src/pages/_app.tsx',
	'src/pages/_app.ts',
	'src/pages/_app.jsx',
	'src/pages/_app.js',
] as const;
