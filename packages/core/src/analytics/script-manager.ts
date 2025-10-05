/**
 * @fileoverview Script management system for analytics destinations.
 * Handles loading, unloading, and managing client-side scripts based on consent.
 */

import type { AnalyticsConsent, ConsentPurpose } from './types';

/**
 * Script types supported by the script manager
 */
export type ScriptType = 'inline' | 'external' | 'module';

/**
 * Script loading strategy
 */
export type ScriptStrategy = 'eager' | 'lazy' | 'consent-based';

/**
 * Script priority for loading order
 */
export type ScriptPriority = 'high' | 'normal' | 'low';

/**
 * Client-side script definition
 */
export interface Script {
	/** Script type */
	type: ScriptType;
	/** Script source URL (for external/module scripts) */
	src?: string;
	/** Script content (for inline scripts) */
	content?: string;
	/** Load script asynchronously */
	async?: boolean;
	/** Defer script execution */
	defer?: boolean;
	/** Cross-origin attribute */
	crossorigin?: 'anonymous' | 'use-credentials';
	/** Script integrity hash */
	integrity?: string;
	/** Additional HTML attributes */
	attributes?: Record<string, string>;
	/** Required consent purposes for this script */
	requiredConsent?: ReadonlyArray<ConsentPurpose>;
	/** Script loading strategy */
	strategy?: ScriptStrategy;
	/** Script priority for loading order */
	priority?: ScriptPriority;
	/** Whether this script should be loaded only once */
	loadOnce?: boolean;
	/** Custom conditions for script loading */
	loadCondition?: (consent: AnalyticsConsent) => boolean;
}

/**
 * Enhanced script interface for universal destinations
 */
export interface UniversalScript extends Script {
	/** Script loading strategy */
	strategy?: ScriptStrategy;
	/** Required consent purposes for this script to load */
	requiredConsent?: ReadonlyArray<ConsentPurpose>;
	/** Script priority for loading order */
	priority?: ScriptPriority;
	/** Whether this script should be loaded only once */
	loadOnce?: boolean;
	/** Custom conditions for script loading */
	loadCondition?: (consent: AnalyticsConsent) => boolean;
}

/**
 * Loaded script information
 */
export interface LoadedScript {
	/** Script ID */
	id: string;
	/** Script definition */
	script: Script;
	/** HTML script element */
	element: HTMLScriptElement;
	/** Load timestamp */
	loadedAt: number;
	/** Load status */
	status: 'loading' | 'loaded' | 'failed';
	/** Error message if failed */
	error?: string;
}

/**
 * Script manager statistics
 */
export interface ScriptManagerStats {
	/** Total scripts loaded */
	totalLoaded: number;
	/** Total scripts failed */
	totalFailed: number;
	/** Total scripts loading */
	totalLoading: number;
	/** Load time statistics */
	loadTimes: {
		average: number;
		min: number;
		max: number;
	};
	/** Cache hit rate */
	cacheHitRate: number;
}

/**
 * Script manager options
 */
export interface ScriptManagerOptions {
	/** Enable script caching */
	enableCaching?: boolean;
	/** Cache TTL in milliseconds */
	cacheTtl?: number;
	/** Enable cross-tab synchronization */
	enableCrossTabSync?: boolean;
	/** Enable error retry */
	enableRetry?: boolean;
	/** Retry delay in milliseconds */
	retryDelay?: number;
	/** Maximum retry attempts */
	maxRetries?: number;
	/** Enable preloading */
	enablePreloading?: boolean;
	/** Script loading timeout */
	loadingTimeout?: number;
	/** Custom script loader */
	customLoader?: (script: Script) => Promise<HTMLScriptElement>;
}

/**
 * Script loading error
 */
export class ScriptLoadingError extends Error {
	constructor(
		message: string,
		public scriptId: string,
		public scriptType: ScriptType
	) {
		super(message);
		this.name = 'ScriptLoadingError';
	}
}

/**
 * Script fetch error
 */
export class ScriptFetchError extends Error {
	constructor(
		message: string,
		public statusCode?: number
	) {
		super(message);
		this.name = 'ScriptFetchError';
	}
}

/**
 * Script manager interface
 */
export interface ScriptManager {
	/** Loaded scripts map */
	loadedScripts: Map<string, LoadedScript>;
	/** Scripts currently loading */
	loadingScripts: Set<string>;
	/** Failed scripts */
	failedScripts: Set<string>;
	/** Script cache */
	cache: Map<string, { scripts: Script[]; timestamp: number }>;
	/** Statistics */
	stats: ScriptManagerStats;

	/**
	 * Load a single script
	 */
	loadScript(script: Script): Promise<LoadedScript>;

	/**
	 * Load multiple scripts
	 */
	loadScripts(scripts: Script[]): Promise<LoadedScript[]>;

	/**
	 * Unload a script by ID
	 */
	unloadScript(scriptId: string): void;

	/**
	 * Unload scripts by consent
	 */
	unloadScriptsByConsent(consent: AnalyticsConsent): void;

	/**
	 * Reload all scripts
	 */
	reloadScripts(scripts: Script[]): Promise<LoadedScript[]>;

	/**
	 * Clear all scripts
	 */
	clearAllScripts(): void;

	/**
	 * Clear script cache
	 */
	clearCache(): void;

	/**
	 * Retry failed scripts
	 */
	retryFailedScripts(): Promise<LoadedScript[]>;

	/**
	 * Preload scripts
	 */
	preloadScripts(scripts: Script[]): Promise<void>;

	/**
	 * Get script status
	 */
	getScriptStatus(scriptId: string): LoadedScript | null;

	/**
	 * Check if script is loaded
	 */
	isScriptLoaded(scriptId: string): boolean;

	/**
	 * Get scripts by consent
	 */
	getScriptsByConsent(consent: AnalyticsConsent): Script[];

	/**
	 * Update statistics
	 */
	updateStats(): void;
}

/**
 * Script manager implementation
 */
export class ScriptManagerImpl implements ScriptManager {
	public loadedScripts = new Map<string, LoadedScript>();
	public loadingScripts = new Set<string>();
	public failedScripts = new Set<string>();
	public cache = new Map<string, { scripts: Script[]; timestamp: number }>();
	public stats: ScriptManagerStats = {
		totalLoaded: 0,
		totalFailed: 0,
		totalLoading: 0,
		loadTimes: { average: 0, min: 0, max: 0 },
		cacheHitRate: 0,
	};

	private options: Required<ScriptManagerOptions>;
	private loadTimes: number[] = [];

	constructor(options: ScriptManagerOptions = {}) {
		this.options = {
			enableCaching: true,
			cacheTtl: 5 * 60 * 1000, // 5 minutes
			enableCrossTabSync: true,
			enableRetry: true,
			retryDelay: 1000,
			maxRetries: 3,
			enablePreloading: false,
			loadingTimeout: 30000, // 30 seconds
			customLoader: undefined,
			...options,
		};
	}

	async loadScript(script: Script): Promise<LoadedScript> {
		const scriptId = this.generateScriptId(script);

		// Check if already loaded
		if (this.loadedScripts.has(scriptId)) {
			const loadedScript = this.loadedScripts.get(scriptId);
			if (!loadedScript) {
				throw new Error(`Script ${scriptId} not found`);
			}
			return loadedScript;
		}

		// Check if currently loading
		if (this.loadingScripts.has(scriptId)) {
			// Wait for existing load to complete
			return this.waitForScriptLoad(scriptId);
		}

		this.loadingScripts.add(scriptId);
		const startTime = Date.now();

		try {
			const element = await this.createScriptElement(script);
			const loadedScript: LoadedScript = {
				id: scriptId,
				script,
				element,
				loadedAt: Date.now(),
				status: 'loaded',
			};

			this.loadedScripts.set(scriptId, loadedScript);
			this.failedScripts.delete(scriptId);
			this.loadTimes.push(Date.now() - startTime);
			this.updateStats();

			return loadedScript;
		} catch (error) {
			const failedScript: LoadedScript = {
				id: scriptId,
				script,
				element: document.createElement('script'),
				loadedAt: Date.now(),
				status: 'failed',
				error: error instanceof Error ? error.message : String(error),
			};

			this.loadedScripts.set(scriptId, failedScript);
			this.failedScripts.add(scriptId);
			this.loadTimes.push(Date.now() - startTime);
			this.updateStats();

			throw new ScriptLoadingError(
				`Failed to load script: ${error instanceof Error ? error.message : String(error)}`,
				scriptId,
				script.type
			);
		} finally {
			this.loadingScripts.delete(scriptId);
		}
	}

	async loadScripts(scripts: Script[]): Promise<LoadedScript[]> {
		// Filter scripts by consent if needed
		const filteredScripts = scripts.filter((script) => {
			if (!script.requiredConsent) return true;
			return script.requiredConsent.every(() => {
				// This would need access to current consent state
				// For now, we'll assume all scripts are allowed
				return true;
			});
		});

		// Sort scripts by priority
		const sortedScripts = filteredScripts.sort((a, b) => {
			const priorityOrder = { high: 3, normal: 2, low: 1 };
			const aPriority = priorityOrder[a.priority || 'normal'];
			const bPriority = priorityOrder[b.priority || 'normal'];
			return bPriority - aPriority;
		});

		const loadPromises = sortedScripts.map((script) => this.loadScript(script));
		const results = await Promise.allSettled(loadPromises);

		return results
			.filter(
				(result): result is PromiseFulfilledResult<LoadedScript> =>
					result.status === 'fulfilled'
			)
			.map((result) => result.value);
	}

	unloadScript(scriptId: string): void {
		const loadedScript = this.loadedScripts.get(scriptId);
		if (loadedScript) {
			loadedScript.element.remove();
			this.loadedScripts.delete(scriptId);
			this.failedScripts.delete(scriptId);
			this.updateStats();
		}
	}

	unloadScriptsByConsent(consent: AnalyticsConsent): void {
		const scriptsToUnload: string[] = [];

		for (const [scriptId, loadedScript] of this.loadedScripts) {
			if (loadedScript.script.requiredConsent) {
				const hasRequiredConsent = loadedScript.script.requiredConsent.every(
					(purpose) => consent[purpose]
				);
				if (!hasRequiredConsent) {
					scriptsToUnload.push(scriptId);
				}
			}
		}

		for (const scriptId of scriptsToUnload) {
			this.unloadScript(scriptId);
		}
	}

	async reloadScripts(scripts: Script[]): Promise<LoadedScript[]> {
		this.clearAllScripts();
		return this.loadScripts(scripts);
	}

	clearAllScripts(): void {
		for (const script of this.loadedScripts.values()) {
			script.element.remove();
		}
		this.loadedScripts.clear();
		this.failedScripts.clear();
		this.loadingScripts.clear();
		this.updateStats();
	}

	clearCache(): void {
		this.cache.clear();
	}

	async retryFailedScripts(): Promise<LoadedScript[]> {
		const failedScripts = Array.from(this.failedScripts);
		const scriptsToRetry: Script[] = [];

		for (const scriptId of failedScripts) {
			const loadedScript = this.loadedScripts.get(scriptId);
			if (loadedScript) {
				scriptsToRetry.push(loadedScript.script);
			}
		}

		return this.loadScripts(scriptsToRetry);
	}

	async preloadScripts(scripts: Script[]): Promise<void> {
		if (!this.options.enablePreloading) return;

		const preloadPromises = scripts.map(async (script) => {
			if (script.type === 'external' && script.src) {
				const link = document.createElement('link');
				link.rel = 'preload';
				link.as = 'script';
				link.href = script.src;
				document.head.appendChild(link);
			}
		});

		await Promise.allSettled(preloadPromises);
	}

	getScriptStatus(scriptId: string): LoadedScript | null {
		return this.loadedScripts.get(scriptId) || null;
	}

	isScriptLoaded(scriptId: string): boolean {
		return this.loadedScripts.has(scriptId);
	}

	getScriptsByConsent(consent: AnalyticsConsent): Script[] {
		const scripts: Script[] = [];

		for (const loadedScript of this.loadedScripts.values()) {
			if (loadedScript.script.requiredConsent) {
				const hasRequiredConsent = loadedScript.script.requiredConsent.every(
					(purpose) => consent[purpose]
				);
				if (hasRequiredConsent) {
					scripts.push(loadedScript.script);
				}
			} else {
				scripts.push(loadedScript.script);
			}
		}

		return scripts;
	}

	updateStats(): void {
		this.stats.totalLoaded = this.loadedScripts.size;
		this.stats.totalFailed = this.failedScripts.size;
		this.stats.totalLoading = this.loadingScripts.size;

		if (this.loadTimes.length > 0) {
			this.stats.loadTimes.average =
				this.loadTimes.reduce((a, b) => a + b, 0) / this.loadTimes.length;
			this.stats.loadTimes.min = Math.min(...this.loadTimes);
			this.stats.loadTimes.max = Math.max(...this.loadTimes);
		}

		// Calculate cache hit rate
		const totalCacheRequests = this.cache.size + this.loadTimes.length;
		this.stats.cacheHitRate =
			totalCacheRequests > 0 ? this.cache.size / totalCacheRequests : 0;
	}

	private generateScriptId(script: Script): string {
		if (script.src) {
			return `script_${btoa(script.src).replace(/[^a-zA-Z0-9]/g, '')}`;
		}
		if (script.content) {
			return `script_${btoa(script.content.substring(0, 50)).replace(/[^a-zA-Z0-9]/g, '')}`;
		}
		return `script_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	private async waitForScriptLoad(scriptId: string): Promise<LoadedScript> {
		return new Promise((resolve, reject) => {
			const checkInterval = setInterval(() => {
				if (this.loadedScripts.has(scriptId)) {
					clearInterval(checkInterval);
					resolve(this.loadedScripts.get(scriptId)!);
				} else if (
					!this.loadingScripts.has(scriptId) &&
					this.failedScripts.has(scriptId)
				) {
					clearInterval(checkInterval);
					reject(
						new ScriptLoadingError('Script load failed', scriptId, 'external')
					);
				}
			}, 100);

			setTimeout(() => {
				clearInterval(checkInterval);
				reject(
					new ScriptLoadingError('Script load timeout', scriptId, 'external')
				);
			}, this.options.loadingTimeout);
		});
	}

	private async createScriptElement(
		script: Script
	): Promise<HTMLScriptElement> {
		if (this.options.customLoader) {
			return this.options.customLoader(script);
		}

		return new Promise((resolve, reject) => {
			const scriptElement = document.createElement('script');

			// Add script ID attribute
			const scriptId = this.generateScriptId(script);
			scriptElement.setAttribute('data-script-id', scriptId);

			switch (script.type) {
				case 'inline':
					if (script.content) {
						scriptElement.textContent = script.content;
						resolve(scriptElement);
					} else {
						reject(new Error('Inline script missing content'));
					}
					break;

				case 'external':
					if (script.src) {
						scriptElement.src = script.src;
						scriptElement.async = script.async || false;
						scriptElement.defer = script.defer || false;

						if (script.crossorigin) {
							scriptElement.crossOrigin = script.crossorigin;
						}

						if (script.integrity) {
							scriptElement.integrity = script.integrity;
						}

						// Add custom attributes
						if (script.attributes) {
							Object.entries(script.attributes).forEach(([key, value]) => {
								scriptElement.setAttribute(key, value);
							});
						}

						scriptElement.onload = () => resolve(scriptElement);
						scriptElement.onerror = () =>
							reject(new Error(`Failed to load script: ${script.src}`));
					} else {
						reject(new Error('External script missing src'));
					}
					break;

				case 'module':
					if (script.src) {
						scriptElement.type = 'module';
						scriptElement.src = script.src;
						scriptElement.onload = () => resolve(scriptElement);
						scriptElement.onerror = () =>
							reject(new Error(`Failed to load module: ${script.src}`));
					} else if (script.content) {
						scriptElement.type = 'module';
						scriptElement.textContent = script.content;
						resolve(scriptElement);
					} else {
						reject(new Error('Module script missing src or content'));
					}
					break;

				default:
					reject(new Error(`Unknown script type: ${script.type}`));
			}

			// Add to DOM
			document.head.appendChild(scriptElement);
		});
	}
}

/**
 * Create a new script manager instance
 */
export function createScriptManager(
	options?: ScriptManagerOptions
): ScriptManager {
	return new ScriptManagerImpl(options);
}
