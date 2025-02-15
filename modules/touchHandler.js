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
            // Initialize timing properties
            this.frameTime = 1000 / 120; // Base timing for up to 120Hz displays
            this.lastFrameTime = 0;
            this.scrollRAF = null;
            this.setupTouchScroll();
            return this;
        },

        setupTouchScroll() {
            const tabsList = EdgeTabsPlus.uiComponents.tabsList;
            
            // Enhanced hardware acceleration and smooth scrolling
            tabsList.style.transform = 'translate3d(0,0,0)';
            tabsList.style.backfaceVisibility = 'hidden';
            tabsList.style.perspective = '1000';
            tabsList.style.willChange = 'transform';  // More specific than scroll-position
            tabsList.style.overscrollBehavior = 'contain';
            tabsList.style.scrollBehavior = 'smooth';
            
            // Ensure proper rendering on high refresh rate displays
            tabsList.style.imageRendering = 'auto';
            tabsList.style.textRendering = 'optimizeLegibility';
            
            this.addTouchListeners(tabsList);
            
            // Add smooth scrolling class for CSS control
            tabsList.classList.add('smooth-scroll');
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
            
            // Cancel any ongoing momentum and animations
            cancelAnimationFrame(this.momentumRAF);
            EdgeTabsPlus.uiComponents.tabsList.style.scrollBehavior = 'auto';
            
            // Clear any existing transitions to prevent ghosting
            EdgeTabsPlus.uiComponents.tabsList.style.transition = 'none';
            requestAnimationFrame(() => {
                EdgeTabsPlus.uiComponents.tabsList.style.transition = '';
            });
        },

onTouchMove(e) {
if (!this.isDragging) return;

const currentTime = performance.now();
const deltaTime = currentTime - this.lastFrameTime;

// Throttle updates to match display refresh rate
if (deltaTime < this.frameTime) return;

const tabsList = EdgeTabsPlus.uiComponents.tabsList;
if (!tabsList) return;

// Cancel any ongoing animations
if (this.scrollRAF) {
    cancelAnimationFrame(this.scrollRAF);
    this.scrollRAF = null;
}

const x = e.touches[0].pageX;
const deltaX = x - this.lastX;

// Calculate new scroll position
const newScrollLeft = this.scrollLeft - (x - this.startX);
const maxScroll = tabsList.scrollWidth - tabsList.clientWidth;
const boundedScrollLeft = Math.max(0, Math.min(newScrollLeft, maxScroll));

// Calculate velocity with high refresh rate compensation
if (deltaTime > 0) {
    const instantVelocity = deltaX / deltaTime;
    const velocityScale = Math.min(1, 60 / (1000 / deltaTime)); // Scale based on actual refresh rate
    this.velocity = instantVelocity * velocityScale;
}

// Schedule update on next frame
this.scrollRAF = requestAnimationFrame(() => {
    tabsList.style.transform = `translateX(0)`; // Force GPU composition
    tabsList.scrollLeft = boundedScrollLeft;
    
    if (boundedScrollLeft === 0 || boundedScrollLeft === maxScroll) {
        this.velocity = 0;
    }
});

this.lastX = x;
this.lastFrameTime = currentTime;
},

        onTouchEnd() {
                    if (!this.isDragging) return;
                    this.isDragging = false;
                    
                    const tabsList = EdgeTabsPlus.uiComponents.tabsList;
                    const maxScroll = tabsList.scrollWidth - tabsList.clientWidth;
                    
                    // Enhanced momentum scrolling with boundary checks
                    const momentum = () => {
                        if (Math.abs(this.velocity) > 0.01) {
                            requestAnimationFrame(() => {
                                const newScrollLeft = tabsList.scrollLeft - (this.velocity * 16);
                                const boundedScrollLeft = Math.max(0, Math.min(newScrollLeft, maxScroll));
                                
                                tabsList.scrollLeft = boundedScrollLeft;
                                
                                // Apply stronger deceleration near boundaries
                                if (boundedScrollLeft === 0 || boundedScrollLeft === maxScroll) {
                                    this.velocity = 0;
                                } else {
                                    // Progressive deceleration
                                    this.velocity *= Math.abs(this.velocity) > 0.5 ? 0.92 : 0.85;
                                }
                                
                                this.momentumRAF = requestAnimationFrame(momentum);
                            });
                        } else {
                            // Snap to nearest tab when momentum ends
                            const tabWidth = tabsList.firstElementChild?.offsetWidth || 0;
                            if (tabWidth > 0) {
                                const targetScroll = Math.round(tabsList.scrollLeft / tabWidth) * tabWidth;
                                tabsList.scrollTo({
                                    left: targetScroll,
                                    behavior: 'smooth'
                                });
                            }
                        }
                    };
                    
                    // Only apply momentum if velocity is significant
                    if (Math.abs(this.velocity) > 0.1) {
                        momentum();
                    }
                }
    };
})();