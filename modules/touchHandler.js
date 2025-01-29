(function() {
    window.EdgeTabsPlus = window.EdgeTabsPlus || {};

    EdgeTabsPlus.touchHandler = {
        startX: null,
        scrollLeft: null,
        isDragging: false,
        lastX: null,
        lastTime: null,
        velocity: 0,
        momentumRAF: null,

        init() {
            this.setupTouchScroll();
            return this;
        },

        setupTouchScroll() {
            const tabsList = EdgeTabsPlus.uiComponents.tabsList;
            
            // Use transform for hardware acceleration
            tabsList.style.transform = 'translate3d(0,0,0)';
            tabsList.style.willChange = 'scroll-position';
            tabsList.style.overscrollBehavior = 'contain';
            
            this.addTouchListeners(tabsList);
        },

        addTouchListeners(tabsList) {
            tabsList.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: true });
            tabsList.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: true });
            tabsList.addEventListener('touchend', this.onTouchEnd.bind(this), { passive: true });
            tabsList.addEventListener('touchcancel', this.onTouchEnd.bind(this), { passive: true });
        },

        onTouchStart(e) {
            this.isDragging = true;
            this.startX = e.touches[0].pageX;
            this.lastX = this.startX;
            this.lastTime = Date.now();
            this.scrollLeft = EdgeTabsPlus.uiComponents.tabsList.scrollLeft;
            this.velocity = 0;
            
            cancelAnimationFrame(this.momentumRAF);
            
            // Prepare for smooth scrolling
            EdgeTabsPlus.uiComponents.tabsList.style.scrollBehavior = 'auto';
        },

        onTouchMove(e) {
            if (!this.isDragging) return;
            
            const x = e.touches[0].pageX;
            const deltaX = x - this.lastX;
            const currentTime = Date.now();
            const deltaTime = currentTime - this.lastTime;
            
            // Calculate velocity (pixels per millisecond)
            if (deltaTime > 0) {
                this.velocity = (deltaX / deltaTime) * 1.5; // Increased sensitivity
            }
            
            // Update scroll position with hardware acceleration
            requestAnimationFrame(() => {
                EdgeTabsPlus.uiComponents.tabsList.scrollLeft = this.scrollLeft - (x - this.startX);
            });
            
            this.lastX = x;
            this.lastTime = currentTime;
        },

        onTouchEnd() {
            if (!this.isDragging) return;
            this.isDragging = false;
            
            // Enhanced momentum scrolling
            const momentum = () => {
                if (Math.abs(this.velocity) > 0.01) {
                    requestAnimationFrame(() => {
                        EdgeTabsPlus.uiComponents.tabsList.scrollLeft -= this.velocity * 16; // 16ms is approx. one frame
                        this.velocity *= 0.95; // Decay factor
                        this.momentumRAF = requestAnimationFrame(momentum);
                    });
                } else {
                    EdgeTabsPlus.uiComponents.tabsList.style.scrollBehavior = 'smooth';
                }
            };
            
            if (Math.abs(this.velocity) > 0.1) {
                momentum();
            } else {
                EdgeTabsPlus.uiComponents.tabsList.style.scrollBehavior = 'smooth';
            }
        }
    };
})();