/**
 * Centralized constants for the c15t CLI
 *
 * All magic strings, URLs, and regex patterns should be defined here
 * to maintain consistency and make updates easier.
 */

// --- URLs ---
export const URLS = {
	/** API documentation */
	API_DOCS: 'https://c15t.com/docs/api',
	/** Product changelog */
	CHANGELOG: 'https://c15t.com/changelog',
	/** CLI documentation */
	CLI_DOCS: 'https://c15t.com/docs/cli',
	/** Default c15t cloud platform URL */
	CONSENT_IO: 'https://inth.com',
	/** Discord community */
	DISCORD: 'https://c15t.com/discord',
	/** Documentation website */
	DOCS: 'https://c15t.com/docs',
	/** GitHub repository */
	GITHUB: 'https://github.com/c15t/c15t',
	/** First-party telemetry logs endpoint */
	TELEMETRY: 'https://telemetry.c15t.com/c15t/v1/logs',
} as const;

// --- File Paths ---
export const PATHS = {
	/** c15t config directory name (in home dir) */
	CONFIG_DIR: '.c15t',
	/** Config file name */
	CONFIG_FILE: 'config.json',
	/** Environment file */
	ENV_FILE: '.env',
	/** Local environment file */
	ENV_LOCAL: '.env.local',
	/** Project config file name */
	PROJECT_CONFIG: 'c15t.config.ts',
	/** Alternative project config file name */
	PROJECT_CONFIG_JS: 'c15t.config.js',
	/** Telemetry retry queue file name */
	TELEMETRY_QUEUE_FILE: 'telemetry-queue.json',
	/** Telemetry state file name */
	TELEMETRY_STATE_FILE: 'telemetry.json',
} as const;

// --- Regex Patterns ---
export const REGEX = {
	/** Hosted c15t platform URL pattern (legacy and current domains) */
	C15T_URL: /^https:\/\/[\w-]+\.(?:c15t\.dev|inth\.app)$/u,
	/** Dynamic route segment pattern (e.g., [locale]) */
	DYNAMIC_SEGMENT: /\[[\w-]+\]/u,
	/** Package name pattern */
	PACKAGE_NAME: /^(?<capture1>@[\w-]+\/)?[\w-]+$/u,
	/** Semantic version pattern */
	SEMVER: /^\d+\.\d+\.\d+(?<capture1>-[\w.]+)?$/u,
	/** Generic URL pattern */
	URL: /^https?:\/\/.+/u,
} as const;

// --- CLI Metadata ---
export const CLI_INFO = {
	/** CLI binary name */
	BIN: 'c15t',
	/** Control-plane client name */
	CONTROL_PLANE_CLIENT_NAME: 'c15t-cli',
	/** CLI name */
	NAME: 'c15t',
	/** Current version (updated during build) */
	VERSION: '2.0.0',
} as const;

// --- Timeouts ---
export const TIMEOUTS = {
	/** Control-plane connection timeout (ms) */
	CONTROL_PLANE_CONNECTION: 30000,
	/** Device flow expiration (seconds) */
	// 15 minutes
	DEVICE_FLOW_EXPIRY: 900,
	/** Device flow polling interval (seconds) */
	DEVICE_FLOW_POLL_INTERVAL: 5,
	/** HTTP request timeout (ms) */
	HTTP_REQUEST: 10000,
} as const;

// --- Environment Variables ---
export const ENV_VARS = {
	/** c15t API key */
	API_KEY: 'C15T_API_KEY',
	/** c15t backend URL */
	BACKEND_URL: 'C15T_URL',
	/** Control-plane/dashboard base URL override */
	CONSENT_URL: 'CONSENT_URL',
	/** Debug mode */
	DEBUG: 'C15T_DEBUG',
	/** Disable telemetry */
	TELEMETRY_DISABLED: 'C15T_TELEMETRY_DISABLED',
	/** Override telemetry ingest endpoint */
	TELEMETRY_ENDPOINT: 'C15T_TELEMETRY_ENDPOINT',
	/** Optional Axiom org ID for telemetry ingest */
	TELEMETRY_ORG_ID: 'C15T_TELEMETRY_ORG_ID',
	/** Optional write key for telemetry ingest */
	TELEMETRY_WRITE_KEY: 'C15T_TELEMETRY_WRITE_KEY',
	/** Enable v2 feature-flagged behavior */
	V2: 'V2',
} as const;

// --- Storage Mode Options ---
export const STORAGE_MODES = {
	/**
	 * @deprecated Use HOSTED instead; remove in v3.0.0.
	 * @see HOSTED
	 */
	C15T: 'c15t',
	CUSTOM: 'custom',
	HOSTED: 'hosted',
	OFFLINE: 'offline',
	SELF_HOSTED: 'self-hosted',
} as const;

export type StorageMode = (typeof STORAGE_MODES)[keyof typeof STORAGE_MODES];

// --- Package Entry Points ---
// The CLI installs the single `c15t` umbrella package for JavaScript, React,
// and Next.js projects; CORE/REACT/NEXTJS are the entry points generated code
// imports from. BACKEND remains its own installable package.
export const PACKAGES = {
	BACKEND: '@c15t/backend',
	CORE: 'c15t',
	NEXTJS: 'c15t/next',
	REACT: 'c15t/react',
} as const;

/** The npm package installed for every frontend framework target. */
export const UMBRELLA_PACKAGE = 'c15t';

/**
 * Scoped framework packages whose direct installation satisfies the umbrella
 * requirement. Apps that granularly installed `@c15t/react` or `@c15t/nextjs`
 * must keep that install style on setup reruns — adding the `c15t` umbrella on
 * top would mix two installs of the same code, a version-skew hazard.
 */
export const SCOPED_FRAMEWORK_PACKAGES = [
	'@c15t/react',
	'@c15t/nextjs',
] as const;

export type AvailablePackage = (typeof PACKAGES)[keyof typeof PACKAGES];

// --- Framework Detection Keys ---
export const FRAMEWORK_KEYS = {
	GATSBY: 'gatsby',
	NEXT: 'next',
	REACT: 'react',
	REMIX: '@remix-run/react',
	VITE_REACT: '@vitejs/plugin-react',
	VITE_REACT_SWC: '@vitejs/plugin-react-swc',
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
