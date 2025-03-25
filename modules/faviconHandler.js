(function() {
    window.EdgeTabsPlus = window.EdgeTabsPlus || {};

    // Constants
    const DB_NAME = 'EdgeTabsPlus';
    const STORE_NAME = 'favicons';
    const DB_VERSION = 1;
    const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

    EdgeTabsPlus.faviconHandler = {
        cache: new Map(),
        loadingPromises: new Map(),
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
                                this.cache.set(this.getNormalizedUrl(item.url), item.favicon);
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
                const item = {
                    url: this.getNormalizedUrl(url),
                    favicon,
                    timestamp: Date.now()
                };
                await store.put(item);
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

        async getCachedFavicon(tab) {
            const normalizedUrl = this.getNormalizedUrl(tab.url);
            return this.cache.get(normalizedUrl);
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

        async loadFavicon(tab) {
            if (!tab?.url) {
                return this.getDefaultIcon();
            }

            const normalizedUrl = this.getNormalizedUrl(tab.url);

            // Check if already loading
            if (this.loadingPromises.has(normalizedUrl)) {
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

                    // Check memory cache
                    const cachedIcon = await this.getCachedFavicon(tab);
                    if (cachedIcon) {
                        resolve(cachedIcon);
                        return;
                    }

                    // Try DuckDuckGo service
                    const duckDuckGoUrl = this.getDuckDuckGoFavicon(tab.url);
                    if (duckDuckGoUrl) {
                        await this.setCachedFavicon(tab, duckDuckGoUrl);
                        resolve(duckDuckGoUrl);
                        return;
                    }

                    // Fallback to native favicon
                    if (tab.favIconUrl) {
                        await this.setCachedFavicon(tab, tab.favIconUrl);
                        resolve(tab.favIconUrl);
                        return;
                    }

                    // Default icon as last resort
                    const defaultIcon = this.getDefaultIcon();
                    await this.setCachedFavicon(tab, defaultIcon);
                    resolve(defaultIcon);

                } catch (error) {
                    EdgeTabsPlus.logger.error(`Error loading favicon: ${error.message}`);
                    resolve(this.getDefaultIcon());
                } finally {
                    this.loadingPromises.delete(normalizedUrl);
                }
            });

            this.loadingPromises.set(normalizedUrl, loadingPromise);
            return loadingPromise;
        },

        async clearCache() {
            this.cache.clear();
            if (this.db) {
                try {
                    const transaction = this.db.transaction(STORE_NAME, 'readwrite');
                    const store = transaction.objectStore(STORE_NAME);
                    await store.clear();
                    EdgeTabsPlus.logger.addLog('Favicon cache cleared (memory and DB)');
                } catch (error) {
                    EdgeTabsPlus.logger.error('Failed to clear DB cache:', error);
                }
            }
        },

        /**
         * Clear both memory and IndexedDB cache
         */
        async clearCache() {
            this.cache.clear();
            if (this.db) {
                try {
                    const transaction = this.db.transaction(STORE_NAME, 'readwrite');
                    const store = transaction.objectStore(STORE_NAME);
                    await store.clear();
                    EdgeTabsPlus.logger.addLog('Favicon cache cleared (memory and DB)');
                } catch (error) {
                    EdgeTabsPlus.logger.error('Failed to clear DB cache:', error);
                    EdgeTabsPlus.logger.addLog('Memory cache cleared only');
                }
            } else {
                EdgeTabsPlus.logger.addLog('Memory cache cleared (DB not available)');
            }
        },

        /**
         * For debugging: Get cache statistics
         */
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
            EdgeTabsPlus.logger.addLog(`Cache stats - Memory: ${memorySize}, DB: ${dbSize} items`);
            return { memorySize, dbSize };
        }
    };
})();