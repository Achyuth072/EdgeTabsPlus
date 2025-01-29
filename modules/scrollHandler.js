(function() {
    window.EdgeTabsPlus = window.EdgeTabsPlus || {};

    EdgeTabsPlus.scrollHandler = {
        lastScrollY: 0,
        isScrolling: false,

        init() {
            this.setupScrollListener();
            return this;
        },

        setupScrollListener() {
            window.addEventListener('scroll', this.handleScroll.bind(this), { passive: true });
        },

        handleScroll() {
            if (!this.isScrolling) {
                requestAnimationFrame(() => {
                    const currentScrollY = window.scrollY;
                    const scrollDelta = currentScrollY - this.lastScrollY;

                    if (Math.abs(scrollDelta) > EdgeTabsPlus.config.scroll.threshold) {
                        requestAnimationFrame(() => {
                            EdgeTabsPlus.uiComponents.strip.style.transform = scrollDelta > 0 ? 
                                'translate3d(0,100%,0)' : 'translate3d(0,0,0)';
                        });
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