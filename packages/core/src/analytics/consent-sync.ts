/**
 * @fileoverview Consent synchronization system for cross-tab and cross-device consent management.
 * Handles consent state synchronization, conflict resolution, and change tracking.
 */

import type { AnalyticsConsent } from './types';

/**
 * Consent change event
 */
export interface ConsentChangeEvent {
	/** Event ID */
	id: string;
	/** Previous consent state */
	previousConsent: AnalyticsConsent;
	/** New consent state */
	newConsent: AnalyticsConsent;
	/** Change source */
	source: string;
	/** Change reason */
	reason?: string;
	/** Change timestamp */
	timestamp: number;
	/** Tab ID where change occurred */
	tabId: string;
	/** User agent */
	userAgent: string;
}

/**
 * Consent synchronization options
 */
export interface ConsentSyncOptions {
	/** Enable cross-tab synchronization */
	enableCrossTabSync?: boolean;
	/** Conflict resolution strategy */
	conflictResolution?: 'latest' | 'user-choice' | 'merge';
	/** Storage key for consent state */
	storageKey?: string;
	/** Storage key for change history */
	historyKey?: string;
	/** Maximum history entries */
	maxHistoryEntries?: number;
	/** Sync timeout in milliseconds */
	syncTimeout?: number;
	/** Enable change tracking */
	enableChangeTracking?: boolean;
	/** Custom conflict resolver */
	customConflictResolver?: (conflict: ConsentConflict) => AnalyticsConsent;
}

/**
 * Consent conflict information
 */
export interface ConsentConflict {
	/** Local consent state */
	localConsent: AnalyticsConsent;
	/** Remote consent state */
	remoteConsent: AnalyticsConsent;
	/** Local timestamp */
	localTimestamp: number;
	/** Remote timestamp */
	remoteTimestamp: number;
	/** Conflict source */
	source: string;
}

/**
 * Consent synchronization statistics
 */
export interface ConsentSyncStats {
	/** Total changes tracked */
	totalChanges: number;
	/** Cross-tab sync events */
	crossTabSyncs: number;
	/** Conflicts resolved */
	conflictsResolved: number;
	/** Last sync timestamp */
	lastSyncTimestamp: number;
	/** Active tabs count */
	activeTabsCount: number;
}

/**
 * Consent synchronization interface
 */
export interface ConsentSync {
	/** Current consent state */
	consent: AnalyticsConsent;
	/** Loading state */
	loading: boolean;
	/** Error state */
	error?: string;
	/** Last updated timestamp */
	lastUpdated: number;
	/** Change source */
	source: string;
	/** Tab ID */
	tabId: string;
	/** Statistics */
	stats: ConsentSyncStats;

	/**
	 * Update consent state
	 */
	updateConsent(
		consent: AnalyticsConsent,
		source?: string,
		reason?: string
	): Promise<void>;

	/**
	 * Reset consent to default
	 */
	resetConsent(): Promise<void>;

	/**
	 * Get change history
	 */
	getChangeHistory(): ConsentChangeEvent[];

	/**
	 * Get consent statistics
	 */
	getConsentStats(): ConsentSyncStats;

	/**
	 * Sync with other tabs
	 */
	syncWithTabs(): Promise<void>;

	/**
	 * Handle storage change
	 */
	handleStorageChange(event: StorageEvent): void;

	/**
	 * Cleanup resources
	 */
	cleanup(): void;

	/**
	 * Destroy the consent sync instance
	 */
	destroy(): void;
}

/**
 * Consent synchronization implementation
 */
export class ConsentSyncImpl implements ConsentSync {
	public consent: AnalyticsConsent;
	public loading = false;
	public error?: string;
	public lastUpdated = Date.now();
	public source = 'initialization';
	public tabId: string;
	public stats: ConsentSyncStats = {
		totalChanges: 0,
		crossTabSyncs: 0,
		conflictsResolved: 0,
		lastSyncTimestamp: 0,
		activeTabsCount: 1,
	};

	private options: Required<ConsentSyncOptions>;
	private changeHistory: ConsentChangeEvent[] = [];
	private storageListener?: (event: StorageEvent) => void;
	private syncInterval?: NodeJS.Timeout;
	private onConsentChange?: (change: ConsentChangeEvent) => void;

	constructor(
		initialConsent: AnalyticsConsent,
		options: ConsentSyncOptions = {},
		onConsentChange?: (change: ConsentChangeEvent) => void
	) {
		this.consent = initialConsent;
		this.tabId = this.generateTabId();
		this.onConsentChange = onConsentChange;

		this.options = {
			enableCrossTabSync: true,
			conflictResolution: 'latest',
			storageKey: 'c15t-consent',
			historyKey: 'c15t-consent-history',
			maxHistoryEntries: 100,
			syncTimeout: 5000,
			enableChangeTracking: true,
			customConflictResolver: (conflict: ConsentConflict) =>
				conflict.localConsent,
			...options,
		};

		this.initialize();
	}

	async updateConsent(
		consent: AnalyticsConsent,
		source = 'user-action',
		reason?: string
	): Promise<void> {
		this.loading = true;
		this.error = undefined;

		try {
			const previousConsent = { ...this.consent };
			this.consent = consent;
			this.lastUpdated = Date.now();
			this.source = source;

			// Create change event
			const changeEvent: ConsentChangeEvent = {
				id: this.generateChangeId(),
				previousConsent,
				newConsent: consent,
				source,
				reason,
				timestamp: this.lastUpdated,
				tabId: this.tabId,
				userAgent: navigator.userAgent,
			};

			// Add to history
			if (this.options.enableChangeTracking) {
				this.addToHistory(changeEvent);
			}

			// Update statistics
			this.stats.totalChanges++;
			this.stats.lastSyncTimestamp = this.lastUpdated;

			// Store in localStorage
			await this.storeConsent(consent);

			// Sync with other tabs
			if (this.options.enableCrossTabSync) {
				await this.syncWithTabs();
			}

			// Notify callback
			this.onConsentChange?.(changeEvent);
		} catch (error) {
			this.error = error instanceof Error ? error.message : String(error);
			throw error;
		} finally {
			this.loading = false;
		}
	}

	async resetConsent(): Promise<void> {
		const defaultConsent: AnalyticsConsent = {
			necessary: true,
			measurement: false,
			marketing: false,
			functionality: false,
			experience: false,
		};

		await this.updateConsent(defaultConsent, 'reset');
	}

	getChangeHistory(): ConsentChangeEvent[] {
		return [...this.changeHistory];
	}

	getConsentStats(): ConsentSyncStats {
		return { ...this.stats };
	}

	async syncWithTabs(): Promise<void> {
		if (!this.options.enableCrossTabSync) return;

		try {
			// Broadcast to other tabs
			this.broadcastConsentChange();

			// Update active tabs count
			this.updateActiveTabsCount();

			this.stats.crossTabSyncs++;
		} catch (error) {
			console.error('Failed to sync with tabs:', error);
		}
	}

	handleStorageChange(event: StorageEvent): void {
		if (!this.options.enableCrossTabSync) return;

		if (event.key === this.options.storageKey && event.newValue) {
			try {
				const remoteConsent = JSON.parse(event.newValue) as AnalyticsConsent;
				this.handleRemoteConsentChange(remoteConsent);
			} catch (error) {
				console.error('Failed to parse remote consent:', error);
			}
		}
	}

	cleanup(): void {
		if (this.storageListener) {
			window.removeEventListener('storage', this.storageListener);
		}

		if (this.syncInterval) {
			clearInterval(this.syncInterval);
		}

		// Remove tab from active tabs
		this.removeTabFromActiveTabs();
	}

	destroy(): void {
		this.cleanup();
	}

	private initialize(): void {
		// Load consent from storage
		this.loadConsentFromStorage();

		// Set up storage listener
		if (this.options.enableCrossTabSync) {
			this.storageListener = (event: StorageEvent) =>
				this.handleStorageChange(event);
			window.addEventListener('storage', this.storageListener);
		}

		// Set up periodic sync
		if (this.options.enableCrossTabSync) {
			this.syncInterval = setInterval(() => {
				this.syncWithTabs();
			}, 30000); // Sync every 30 seconds
		}

		// Add tab to active tabs
		this.addTabToActiveTabs();
	}

	private async loadConsentFromStorage(): Promise<void> {
		try {
			const stored = localStorage.getItem(this.options.storageKey);
			if (stored) {
				const storedConsent = JSON.parse(stored) as AnalyticsConsent;

				// Check for conflicts
				if (this.hasConsentConflict(storedConsent)) {
					const resolvedConsent = this.resolveConflict(storedConsent);
					this.consent = resolvedConsent;
				} else {
					this.consent = storedConsent;
				}
			}
		} catch (error) {
			console.error('Failed to load consent from storage:', error);
		}
	}

	private async storeConsent(consent: AnalyticsConsent): Promise<void> {
		try {
			localStorage.setItem(this.options.storageKey, JSON.stringify(consent));
		} catch (error) {
			console.error('Failed to store consent:', error);
			throw error;
		}
	}

	private hasConsentConflict(remoteConsent: AnalyticsConsent): boolean {
		return JSON.stringify(this.consent) !== JSON.stringify(remoteConsent);
	}

	private resolveConflict(remoteConsent: AnalyticsConsent): AnalyticsConsent {
		this.stats.conflictsResolved++;

		switch (this.options.conflictResolution) {
			case 'latest':
				// Use the most recent consent based on timestamp
				return this.lastUpdated > this.stats.lastSyncTimestamp
					? this.consent
					: remoteConsent;

			case 'user-choice':
				// Use local consent (user's current choice)
				return this.consent;

			case 'merge':
				// Merge consent states (most permissive)
				return this.mergeConsentStates(this.consent, remoteConsent);

			default:
				if (this.options.customConflictResolver) {
					const conflict: ConsentConflict = {
						localConsent: this.consent,
						remoteConsent,
						localTimestamp: this.lastUpdated,
						remoteTimestamp: this.stats.lastSyncTimestamp,
						source: 'storage-sync',
					};
					return this.options.customConflictResolver(conflict);
				}
				return this.consent;
		}
	}

	private mergeConsentStates(
		local: AnalyticsConsent,
		remote: AnalyticsConsent
	): AnalyticsConsent {
		return {
			necessary: local.necessary || remote.necessary,
			measurement: local.measurement || remote.measurement,
			marketing: local.marketing || remote.marketing,
			functionality: local.functionality || remote.functionality,
			experience: local.experience || remote.experience,
		};
	}

	private handleRemoteConsentChange(remoteConsent: AnalyticsConsent): void {
		if (this.hasConsentConflict(remoteConsent)) {
			const resolvedConsent = this.resolveConflict(remoteConsent);
			this.consent = resolvedConsent;
			this.source = 'cross-tab-sync';
			this.lastUpdated = Date.now();
		}
	}

	private broadcastConsentChange(): void {
		// Use BroadcastChannel if available
		if ('BroadcastChannel' in window) {
			const channel = new BroadcastChannel('c15t-consent-sync');
			channel.postMessage({
				type: 'consent-change',
				consent: this.consent,
				timestamp: this.lastUpdated,
				tabId: this.tabId,
			});
			channel.close();
		}
	}

	private addToHistory(changeEvent: ConsentChangeEvent): void {
		this.changeHistory.unshift(changeEvent);

		// Limit history size
		if (this.changeHistory.length > this.options.maxHistoryEntries) {
			this.changeHistory = this.changeHistory.slice(
				0,
				this.options.maxHistoryEntries
			);
		}

		// Store history in localStorage
		try {
			localStorage.setItem(
				this.options.historyKey,
				JSON.stringify(this.changeHistory)
			);
		} catch (error) {
			console.error('Failed to store change history:', error);
		}
	}

	private updateActiveTabsCount(): void {
		try {
			const activeTabs = localStorage.getItem('c15t-active-tabs');
			if (activeTabs) {
				const tabs = JSON.parse(activeTabs) as string[];
				this.stats.activeTabsCount = tabs.length;
			}
		} catch (error) {
			console.error('Failed to update active tabs count:', error);
		}
	}

	private addTabToActiveTabs(): void {
		try {
			const activeTabs = localStorage.getItem('c15t-active-tabs');
			const tabs = activeTabs ? (JSON.parse(activeTabs) as string[]) : [];

			if (!tabs.includes(this.tabId)) {
				tabs.push(this.tabId);
				localStorage.setItem('c15t-active-tabs', JSON.stringify(tabs));
			}
		} catch (error) {
			console.error('Failed to add tab to active tabs:', error);
		}
	}

	private removeTabFromActiveTabs(): void {
		try {
			const activeTabs = localStorage.getItem('c15t-active-tabs');
			if (activeTabs) {
				const tabs = JSON.parse(activeTabs) as string[];
				const filteredTabs = tabs.filter((tabId) => tabId !== this.tabId);
				localStorage.setItem('c15t-active-tabs', JSON.stringify(filteredTabs));
			}
		} catch (error) {
			console.error('Failed to remove tab from active tabs:', error);
		}
	}

	private generateTabId(): string {
		return `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	private generateChangeId(): string {
		return `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}
}

/**
 * Create a new consent synchronization instance
 */
export function createConsentSync(
	initialConsent: AnalyticsConsent,
	options?: ConsentSyncOptions,
	onConsentChange?: (change: ConsentChangeEvent) => void
): ConsentSync {
	return new ConsentSyncImpl(initialConsent, options, onConsentChange);
}
