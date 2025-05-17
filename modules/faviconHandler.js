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
            EdgeTabsPlus.logToEruda('Initializing favicon handler...', 'log');
            await this.initDatabase();
            await this.loadCacheFromDB();
            return this;
        },

        async initDatabase() {
            try {
                return new Promise((resolve, reject) => {
                    const request = indexedDB.open(DB_NAME, DB_VERSION);

                    request.onerror = () => {
                        EdgeTabsPlus.logToEruda('Failed to open IndexedDB', 'error');
                        resolve(); // Continue without persistence
                    };

                    request.onsuccess = (event) => {
                        this.db = event.target.result;
                        EdgeTabsPlus.logToEruda('IndexedDB initialized', 'log');
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
                EdgeTabsPlus.logToEruda(`IndexedDB initialization failed: ${error}`, 'error');
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
                        EdgeTabsPlus.logToEruda(`Loaded ${this.cache.size} favicons from DB`, 'log');
                        resolve();
                    };
                    request.onerror = () => {
                        EdgeTabsPlus.logToEruda('Failed to load cache from DB', 'error');
                        resolve();
                    };
                });
            } catch (error) {
                EdgeTabsPlus.logToEruda(`Error loading cache from DB: ${error}`, 'error');
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
                EdgeTabsPlus.logToEruda(`Failed to save favicon to DB: ${error}`, 'error');
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
                        EdgeTabsPlus.logToEruda(`[PREFETCH] Started for ${prefetchCount} tabs`, 'debug');
                    }
                });
            } catch (error) {
                EdgeTabsPlus.logToEruda(`[PREFETCH] Failed: ${error}`, 'error');
            }
        },

        async getCachedFavicon(tab) {
            // Skip cache for Edge URLs to ensure we always load fresh Edge icon
            if (tab.url.startsWith('edge://') || tab.url === 'chrome-native://newtab/') {
                EdgeTabsPlus.logToEruda(`[CACHE] Bypassing cache for Edge URL: ${tab.url}`, 'debug');
                return null;
            }

            const normalizedUrl = this.getNormalizedUrl(tab.url);
            
            // Check memory cache
            const memoryCache = this.cache.get(normalizedUrl);
            if (memoryCache) {
                EdgeTabsPlus.logToEruda(`[CACHE] Memory hit for ${normalizedUrl}`, 'debug');
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
                        EdgeTabsPlus.logToEruda(`[CACHE] DB hit for ${normalizedUrl}`, 'debug');
                        this.cache.set(normalizedUrl, result.favicon); // Populate memory cache
                        return result.favicon;
                    }
                } catch (error) {
                    EdgeTabsPlus.logToEruda(`Error checking DB cache: ${error}`, 'error');
                }
            }

            EdgeTabsPlus.logToEruda(`[CACHE] Miss for ${normalizedUrl}`, 'debug');
            return null;
        },

        async setCachedFavicon(tab, faviconUrl) {
            const normalizedUrl = this.getNormalizedUrl(tab.url);
            this.cache.set(normalizedUrl, faviconUrl);
            await this.saveToDB(normalizedUrl, faviconUrl);
            EdgeTabsPlus.logToEruda(`Cached favicon for ${normalizedUrl}`, 'log');
        },

        getDefaultIcon() {
            return chrome.runtime.getURL('icons/default-favicon.png');
        },

        async getEdgeIcon() {
            const iconUrl = chrome.runtime.getURL('icons/edge-logo.png');
            EdgeTabsPlus.logToEruda(`[getEdgeIcon] Generated Edge icon URL: ${iconUrl}`, 'debug');
            
            try {
                // Ensure the URL is accessible
                const response = await fetch(iconUrl);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                EdgeTabsPlus.logToEruda(`[getEdgeIcon] Icon fetch successful: ${response.ok}`, 'debug');
                return iconUrl;
            } catch (error) {
                EdgeTabsPlus.logToEruda(`[getEdgeIcon] Icon fetch failed: ${error}`, 'error');
                // Return the URL anyway since the error might be temporary
                return iconUrl;
            }
        },

        getDuckDuckGoFavicon(url) {
            try {
                const hostname = new URL(url).hostname;
                return `https://icons.duckduckgo.com/ip3/${hostname}.ico`;
            } catch (error) {
                EdgeTabsPlus.logToEruda(`Failed to get DuckDuckGo favicon: ${error.message}`, 'error');
                return null;
            }
        },

        // Internal loading function without debounce, used by prefetch and the debounced wrapper
        async loadFaviconInternal(tab) {
             const normalizedUrl = this.getNormalizedUrl(tab.url);

             // Check if already loading (this check is crucial here too)
             if (this.loadingPromises.has(normalizedUrl)) {
                 EdgeTabsPlus.logToEruda(`[LOAD_INTERNAL] Already loading ${normalizedUrl}`, 'debug');
                 return this.loadingPromises.get(normalizedUrl);
             }

             const loadingPromise = new Promise(async (resolve) => {
                 try {
                     // Edge internal pages (including chrome-native://newtab/)
                     if (tab.url.startsWith('edge://') || tab.url === 'chrome-native://newtab/') {
                         EdgeTabsPlus.logToEruda(`[LOAD_INTERNAL] Using Edge icon for ${tab.url}`, 'debug');
                         
                         // Clear any cached version from both memory and IndexedDB
                         await this.clearCache(tab.url);
                         
                         // Force a fresh icon load
                         const edgeIcon = this.getEdgeIcon();
                         EdgeTabsPlus.logToEruda(`[LOAD_INTERNAL] Generated Edge icon URL: ${edgeIcon}`, 'debug');
                         
                         // Set new favicon with cache busting
                         await this.setCachedFavicon(tab, edgeIcon + '?t=' + Date.now());
                         
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
                         EdgeTabsPlus.logToEruda(`[LOAD_INTERNAL] Using DuckDuckGo favicon for ${normalizedUrl}`, 'debug');
                         await this.setCachedFavicon(tab, duckDuckGoUrl);
                         resolve(duckDuckGoUrl);
                         return;
                     }

                     // Fallback to native favicon
                     if (tab.favIconUrl) {
                         EdgeTabsPlus.logToEruda(`[LOAD_INTERNAL] Using native favicon for ${normalizedUrl}`, 'debug');
                         await this.setCachedFavicon(tab, tab.favIconUrl);
                         resolve(tab.favIconUrl);
                         return;
                     }

                     // Default icon as last resort
                     EdgeTabsPlus.logToEruda(`[LOAD_INTERNAL] Using default icon for ${normalizedUrl}`, 'debug');
                     const defaultIcon = this.getDefaultIcon();
                     await this.setCachedFavicon(tab, defaultIcon);
                     resolve(defaultIcon);

                 } catch (error) {
                     EdgeTabsPlus.logToEruda(`[LOAD_INTERNAL] Error loading favicon: ${error.message}`, 'error');
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
                EdgeTabsPlus.logToEruda('[LOAD] No URL provided, using default icon', 'debug');
                return this.getDefaultIcon();
            }

            const normalizedUrl = this.getNormalizedUrl(tab.url);
            EdgeTabsPlus.logToEruda(`[LOAD] Request for ${normalizedUrl} (tab ${tab.id})`, 'debug');

            // Quick cache check before debouncing
            const quickCacheCheck = await this.getCachedFavicon(tab);
            if (quickCacheCheck) {
                EdgeTabsPlus.logToEruda(`[LOAD] Using cached favicon for ${normalizedUrl}`, 'debug');
                return quickCacheCheck;
            }

            // Debounce the internal loading logic
            // Use .bind(this) to ensure 'this' context is correct inside the debounced function
            return this.debounce(normalizedUrl, this.loadFaviconInternal.bind(this, tab));
        },


        async clearCache(url = null) {
            if (url) {
                const normalizedUrl = this.getNormalizedUrl(url);
                EdgeTabsPlus.logToEruda(`[CACHE] Clearing cache for specific URL: ${normalizedUrl}`, 'debug');
                // Clear from memory
                this.cache.delete(normalizedUrl);
                // Clear from DB
                if (this.db) {
                    try {
                        const transaction = this.db.transaction(STORE_NAME, 'readwrite');
                        const store = transaction.objectStore(STORE_NAME);
                        await store.delete(normalizedUrl);
                        EdgeTabsPlus.logToEruda(`[CACHE] Cleared ${normalizedUrl} from IndexedDB`, 'debug');
                    } catch (error) {
                        EdgeTabsPlus.logToEruda(`Failed to clear DB cache for ${normalizedUrl}: ${error}`, 'error');
                    }
                }
            } else {
                const memoryCount = this.cache.size;
                this.cache.clear();
                if (this.db) {
                    try {
                        const transaction = this.db.transaction(STORE_NAME, 'readwrite');
                        const store = transaction.objectStore(STORE_NAME);
                        await store.clear();
                        EdgeTabsPlus.logToEruda(`Cleared ${memoryCount} favicons from memory and DB`, 'log');
                    } catch (error) {
                        EdgeTabsPlus.logToEruda(`Failed to clear DB cache: ${error}`, 'error');
                        EdgeTabsPlus.logToEruda(`Cleared ${memoryCount} favicons from memory only`, 'log');
                    }
                } else {
                    EdgeTabsPlus.logToEruda(`Cleared ${memoryCount} favicons from memory (DB not available)`, 'log');
                }
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
                    EdgeTabsPlus.logToEruda(`Failed to get DB stats: ${error}`, 'error');
                }
            }

            const activeLoads = this.loadingPromises.size;
            const stats = {
                memorySize,
                dbSize,
                activeLoads,
                loadingUrls: Array.from(this.loadingPromises.keys())
            };

            EdgeTabsPlus.logToEruda(`Cache stats: ${JSON.stringify(stats)}`, 'log');
            return stats;
        }
    };
})();