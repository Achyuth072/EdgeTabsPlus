(function() {
    window.EdgeTabsPlus = window.EdgeTabsPlus || {};

    // Constants
    const DB_NAME = 'EdgeTabsPlus';
    const STORE_NAME = 'favicons';
    const DB_VERSION = 1;
    const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
    const DEBOUNCE_DELAY = 200; // ms

    EdgeTabsPlus.faviconHandler = {
        cache: new Map(),
        loadingPromises: new Map(),
        loadDebounceTimers: new Map(),
        db: null,

        async init() {
            EdgeTabsPlus.logger.addLog('Initializing favicon handler...');
            await this.initDatabase();
            await this.loadCacheFromDB();
            return this;
        },

        async initDatabase() {
            try {
                return new Promise((resolve, reject) => {
                    const request = indexedDB.open(DB_NAME, DB_VERSION);

                    request.onerror = () => {
                        EdgeTabsPlus.logger.error('Failed to open IndexedDB');
                        resolve(); // Continue without persistence
                    };

                    request.onsuccess = (event) => {
                        this.db = event.target.result;
                        EdgeTabsPlus.logger.addLog('IndexedDB initialized');
                        resolve();
                    };

                    request.onupgradeneeded = (event) => {
                        const db = event.target.result;
                        if (!db.objectStoreNames.contains(STORE_NAME)) {
                            const store = db.createObjectStore(STORE_NAME, { keyPath: 'url' });
                            store.createIndex('timestamp', 'timestamp');
                        }
                    };
                });
            } catch (error) {
                EdgeTabsPlus.logger.error('IndexedDB initialization failed:', error);
            }
        },

        async loadCacheFromDB() {
            if (!this.db) return;

            try {
                const transaction = this.db.transaction(STORE_NAME, 'readonly');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.getAll();

                await new Promise((resolve, reject) => {
                    request.onsuccess = () => {
                        const items = request.result;
                        const now = Date.now();
                        items.forEach(item => {
                            if (now - item.timestamp < CACHE_EXPIRY) {
                                this.cache.set(item.url, item.favicon);
                            }
                        });
                        EdgeTabsPlus.logger.addLog(`Loaded ${this.cache.size} favicons from DB`);
                        resolve();
                    };
                    request.onerror = () => {
                        EdgeTabsPlus.logger.error('Failed to load cache from DB');
                        resolve();
                    };
                });
            } catch (error) {
                EdgeTabsPlus.logger.error('Error loading cache from DB:', error);
            }
        },

        async saveToDB(url, favicon) {
            if (!this.db) return;

            try {
                const transaction = this.db.transaction(STORE_NAME, 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                await store.put({
                    url: url,
                    favicon: favicon,
                    timestamp: Date.now()
                });
            } catch (error) {
                EdgeTabsPlus.logger.error('Failed to save favicon to DB:', error);
            }
        },

        getNormalizedUrl(url) {
            try {
                const urlObj = new URL(url);
                return urlObj.origin;
            } catch (error) {
                return url;
            }
        },

        debounce(key, fn, delay = DEBOUNCE_DELAY) {
            if (this.loadDebounceTimers.has(key)) {
                clearTimeout(this.loadDebounceTimers.get(key));
            }
            return new Promise(resolve => {
                const timer = setTimeout(async () => {
                    this.loadDebounceTimers.delete(key);
                    resolve(await fn());
                }, delay);
                this.loadDebounceTimers.set(key, timer);
            });
        },

        async prefetchVisibleTabFavicons(currentTabId) {
            try {
                chrome.tabs.query({}, async (tabs) => {
                    let prefetchCount = 0;
                    for (const tab of tabs) {
                        if (tab.id !== currentTabId) {
                            const normalizedUrl = this.getNormalizedUrl(tab.url);
                            if (!this.cache.has(normalizedUrl) && !this.loadingPromises.has(normalizedUrl)) {
                                // Use a separate, non-debounced load for prefetch to avoid delaying user actions
                                this.loadFaviconInternal(tab).catch(() => {});
                                prefetchCount++;
                            }
                        }
                    }
                    if (prefetchCount > 0) {
                        EdgeTabsPlus.logger.debug(`[PREFETCH] Started for ${prefetchCount} tabs`);
                    }
                });
            } catch (error) {
                EdgeTabsPlus.logger.error('[PREFETCH] Failed:', error);
            }
        },

        async getCachedFavicon(tab) {
            const normalizedUrl = this.getNormalizedUrl(tab.url);
            
            // Check memory cache
            const memoryCache = this.cache.get(normalizedUrl);
            if (memoryCache) {
                EdgeTabsPlus.logger.debug(`[CACHE] Memory hit for ${normalizedUrl}`);
                return memoryCache;
            }

            // Check IndexedDB if available
            if (this.db) {
                try {
                    const transaction = this.db.transaction(STORE_NAME, 'readonly');
                    const store = transaction.objectStore(STORE_NAME);
                    const request = store.get(normalizedUrl);
                    
                    const result = await new Promise((resolve, reject) => {
                        request.onsuccess = () => resolve(request.result);
                        request.onerror = () => reject(request.error);
                    });

                    if (result) {
                        EdgeTabsPlus.logger.debug(`[CACHE] DB hit for ${normalizedUrl}`);
                        this.cache.set(normalizedUrl, result.favicon); // Populate memory cache
                        return result.favicon;
                    }
                } catch (error) {
                    EdgeTabsPlus.logger.error('Error checking DB cache:', error);
                }
            }

            EdgeTabsPlus.logger.debug(`[CACHE] Miss for ${normalizedUrl}`);
            return null;
        },

        async setCachedFavicon(tab, faviconUrl) {
            const normalizedUrl = this.getNormalizedUrl(tab.url);
            this.cache.set(normalizedUrl, faviconUrl);
            await this.saveToDB(normalizedUrl, faviconUrl);
            EdgeTabsPlus.logger.addLog(`Cached favicon for ${normalizedUrl}`);
        },

        getDefaultIcon() {
            return chrome.runtime.getURL('icons/default-favicon.png');
        },

        getEdgeIcon() {
            return chrome.runtime.getURL('icons/edge-logo.png');
        },

        getDuckDuckGoFavicon(url) {
            try {
                const hostname = new URL(url).hostname;
                return `https://icons.duckduckgo.com/ip3/${hostname}.ico`;
            } catch (error) {
                EdgeTabsPlus.logger.error(`Failed to get DuckDuckGo favicon: ${error.message}`);
                return null;
            }
        },

        // Internal loading function without debounce, used by prefetch and the debounced wrapper
        async loadFaviconInternal(tab) {
             const normalizedUrl = this.getNormalizedUrl(tab.url);

             // Check if already loading (this check is crucial here too)
             if (this.loadingPromises.has(normalizedUrl)) {
                 EdgeTabsPlus.logger.debug(`[LOAD_INTERNAL] Already loading ${normalizedUrl}`);
                 return this.loadingPromises.get(normalizedUrl);
             }

             const loadingPromise = new Promise(async (resolve) => {
                 try {
                     // Edge internal pages
                     if (tab.url.startsWith('edge://')) {
                         const edgeIcon = this.getEdgeIcon();
                         await this.setCachedFavicon(tab, edgeIcon);
                         resolve(edgeIcon);
                         return;
                     }

                     // Check cache again (might have been populated by another process)
                     const cachedIcon = await this.getCachedFavicon(tab);
                     if (cachedIcon) {
                         resolve(cachedIcon);
                         return;
                     }

                     // Try DuckDuckGo service
                     const duckDuckGoUrl = this.getDuckDuckGoFavicon(tab.url);
                     if (duckDuckGoUrl) {
                         EdgeTabsPlus.logger.debug(`[LOAD_INTERNAL] Using DuckDuckGo favicon for ${normalizedUrl}`);
                         await this.setCachedFavicon(tab, duckDuckGoUrl);
                         resolve(duckDuckGoUrl);
                         return;
                     }

                     // Fallback to native favicon
                     if (tab.favIconUrl) {
                         EdgeTabsPlus.logger.debug(`[LOAD_INTERNAL] Using native favicon for ${normalizedUrl}`);
                         await this.setCachedFavicon(tab, tab.favIconUrl);
                         resolve(tab.favIconUrl);
                         return;
                     }

                     // Default icon as last resort
                     EdgeTabsPlus.logger.debug(`[LOAD_INTERNAL] Using default icon for ${normalizedUrl}`);
                     const defaultIcon = this.getDefaultIcon();
                     await this.setCachedFavicon(tab, defaultIcon);
                     resolve(defaultIcon);

                 } catch (error) {
                     EdgeTabsPlus.logger.error(`[LOAD_INTERNAL] Error loading favicon: ${error.message}`);
                     resolve(this.getDefaultIcon());
                 } finally {
                     this.loadingPromises.delete(normalizedUrl);
                 }
             });

             this.loadingPromises.set(normalizedUrl, loadingPromise);
             return loadingPromise;
        },

        // Public-facing load function with debounce
        async loadFavicon(tab) {
            if (!tab?.url) {
                EdgeTabsPlus.logger.debug('[LOAD] No URL provided, using default icon');
                return this.getDefaultIcon();
            }

            const normalizedUrl = this.getNormalizedUrl(tab.url);
            EdgeTabsPlus.logger.debug(`[LOAD] Request for ${normalizedUrl} (tab ${tab.id})`);

            // Quick cache check before debouncing
            const quickCacheCheck = await this.getCachedFavicon(tab);
            if (quickCacheCheck) {
                EdgeTabsPlus.logger.debug(`[LOAD] Using cached favicon for ${normalizedUrl}`);
                return quickCacheCheck;
            }

            // Debounce the internal loading logic
            // Use .bind(this) to ensure 'this' context is correct inside the debounced function
            return this.debounce(normalizedUrl, this.loadFaviconInternal.bind(this, tab));
        },


        async clearCache() {
            const memoryCount = this.cache.size;
            this.cache.clear();
            if (this.db) {
                try {
                    const transaction = this.db.transaction(STORE_NAME, 'readwrite');
                    const store = transaction.objectStore(STORE_NAME);
                    await store.clear();
                    EdgeTabsPlus.logger.addLog(`Cleared ${memoryCount} favicons from memory and DB`);
                } catch (error) {
                    EdgeTabsPlus.logger.error('Failed to clear DB cache:', error);
                    EdgeTabsPlus.logger.addLog(`Cleared ${memoryCount} favicons from memory only`);
                }
            } else {
                EdgeTabsPlus.logger.addLog(`Cleared ${memoryCount} favicons from memory (DB not available)`);
            }
        },

        async getCacheStats() {
            const memorySize = this.cache.size;
            let dbSize = 0;

            if (this.db) {
                try {
                    const transaction = this.db.transaction(STORE_NAME, 'readonly');
                    const store = transaction.objectStore(STORE_NAME);
                    const request = store.count();
                    
                    await new Promise((resolve, reject) => {
                        request.onsuccess = () => {
                            dbSize = request.result;
                            resolve();
                        };
                        request.onerror = reject;
                    });
                } catch (error) {
                    EdgeTabsPlus.logger.error('Failed to get DB stats:', error);
                }
            }

            const activeLoads = this.loadingPromises.size;
            const stats = {
                memorySize,
                dbSize,
                activeLoads,
                loadingUrls: Array.from(this.loadingPromises.keys())
            };

            EdgeTabsPlus.logger.addLog(`Cache stats:`, stats);
            return stats;
        }
    };
})();