(function() {
    window.EdgeTabsPlus = window.EdgeTabsPlus || {};

    EdgeTabsPlus.faviconHandler = {
        cache: new Map(),
        loadingPromises: new Map(),

        init() {
            EdgeTabsPlus.logger.addLog('Initializing favicon handler...');
            return this;
        },

        getCacheKey(tab) {
            return `${tab.id}-${tab.url}`;
        },

        getCachedFavicon(tab) {
            const cacheKey = this.getCacheKey(tab);
            const cachedIcon = this.cache.get(cacheKey);
            if (cachedIcon) {
                EdgeTabsPlus.logger.addLog(`Using cached favicon for tab ${tab.id}: ${cachedIcon}`);
            }
            return cachedIcon;
        },

        setCachedFavicon(tab, faviconUrl) {
            const cacheKey = this.getCacheKey(tab);
            this.cache.set(cacheKey, faviconUrl);
            EdgeTabsPlus.logger.addLog(`Cached favicon for tab ${tab.id}: ${faviconUrl}`);
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
            if (!tab || !tab.url) {
                EdgeTabsPlus.logger.addLog(`No valid tab or URL for favicon loading`);
                return this.getDefaultIcon();
            }

            const cacheKey = this.getCacheKey(tab);

            // Check if already loading this favicon
            if (this.loadingPromises.has(cacheKey)) {
                EdgeTabsPlus.logger.addLog(`Already loading favicon for tab ${tab.id}, waiting...`);
                return this.loadingPromises.get(cacheKey);
            }

            // Create new loading promise
            const loadingPromise = new Promise(async (resolve) => {
                try {
                    // Check if it's an Edge internal page
                    if (tab.url.startsWith('edge://')) {
                        EdgeTabsPlus.logger.addLog(`Edge internal page detected for tab: ${tab.id}`);
                        const edgeIcon = this.getEdgeIcon();
                        this.setCachedFavicon(tab, edgeIcon);
                        resolve(edgeIcon);
                        return;
                    }

                    // Try cached favicon first
                    const cachedIcon = this.getCachedFavicon(tab);
                    if (cachedIcon) {
                        resolve(cachedIcon);
                        return;
                    }

                    // Always try DuckDuckGo's service first for reliability
                    const duckDuckGoUrl = this.getDuckDuckGoFavicon(tab.url);
                    if (duckDuckGoUrl) {
                        EdgeTabsPlus.logger.addLog(`Using DuckDuckGo favicon service for tab ${tab.id}: ${duckDuckGoUrl}`);
                        this.setCachedFavicon(tab, duckDuckGoUrl);
                        resolve(duckDuckGoUrl);
                        return;
                    }

                    // If DuckDuckGo fails, try tab's native favicon
                    if (tab.favIconUrl) {
                        EdgeTabsPlus.logger.addLog(`Using native favicon for tab ${tab.id}: ${tab.favIconUrl}`);
                        this.setCachedFavicon(tab, tab.favIconUrl);
                        resolve(tab.favIconUrl);
                        return;
                    }

                    // Last resort: default icon
                    const defaultIcon = this.getDefaultIcon();
                    EdgeTabsPlus.logger.addLog(`Using default icon for tab ${tab.id}`);
                    this.setCachedFavicon(tab, defaultIcon);
                    resolve(defaultIcon);

                } catch (error) {
                    EdgeTabsPlus.logger.error(`Error loading favicon: ${error.message}`);
                    const defaultIcon = this.getDefaultIcon();
                    this.setCachedFavicon(tab, defaultIcon);
                    resolve(defaultIcon);
                } finally {
                    this.loadingPromises.delete(cacheKey);
                }
            });

            this.loadingPromises.set(cacheKey, loadingPromise);
            return loadingPromise;
        },

        clearCache() {
            this.cache.clear();
            EdgeTabsPlus.logger.addLog('Favicon cache cleared');
        }
    };
})();