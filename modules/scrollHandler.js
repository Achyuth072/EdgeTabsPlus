(function() {
    window.EdgeTabsPlus = window.EdgeTabsPlus || {};

    EdgeTabsPlus.scrollHandler = {
        lastScrollY: 0,
        isScrolling: false,
        isAutoHideEnabled: true, // Default to true as per requirement

        init() {
            // Get initial auto-hide state from storage
            chrome.storage.sync.get('autoHide', (result) => {
                this.isAutoHideEnabled = result.autoHide !== undefined ? result.autoHide : true;
                EdgeTabsPlus.logger.addLog(`Scroll handler initialized with auto-hide: ${this.isAutoHideEnabled}`);
            });
            this.setupScrollListener();
            return this;
        },

        setAutoHide(enabled) {
            this.isAutoHideEnabled = enabled;
            const strip = document.getElementById('edgetabs-plus-strip');
            if (strip) {
                if (!enabled) {
                    // Reset position when disabled
                    strip.classList.remove('hidden');
                    strip.style.transform = 'translate3d(0,0,0)';
                }
            }
            EdgeTabsPlus.logger.addLog(`Auto-hide ${enabled ? 'enabled' : 'disabled'}`);
        },

        setupScrollListener() {
            window.addEventListener('scroll', this.handleScroll.bind(this), { passive: true });
        },

        handleScroll() {
            if (!this.isAutoHideEnabled || !this.isScrolling) {
                requestAnimationFrame(() => {
                    const currentScrollY = window.scrollY;
                    const scrollDelta = currentScrollY - this.lastScrollY;
                    const strip = document.getElementById('edgetabs-plus-strip');

                    if (strip && Math.abs(scrollDelta) > EdgeTabsPlus.config.scroll.threshold) {
                        if (this.isAutoHideEnabled) {
                            requestAnimationFrame(() => {
                                if (scrollDelta > 0) {
                                    // Scrolling down - hide
                                    strip.classList.add('hidden');
                                } else {
                                    // Scrolling up - show
                                    strip.classList.remove('hidden');
                                }
                            });
                        }
                        this.lastScrollY = currentScrollY;
                    }
                });
            }
            this.isScrolling = false;
        },

        updateScrollSnapPoints() {
            const tabsList = document.getElementById('tabs-list');
            const tabs = tabsList.getElementsByClassName('tab-item');
            let snapPoints = '';
            
            Array.from(tabs).forEach((tab, index) => {
                const position = (tab.offsetWidth * index);
                snapPoints += `${position}px `;
            });
            
            tabsList.style.scrollSnapPoints = `x mandatory ${snapPoints}`;
        }
    };
})();