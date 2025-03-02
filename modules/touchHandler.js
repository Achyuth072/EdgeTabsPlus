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
            this.lastTime = performance.now();
            this.scrollLeft = EdgeTabsPlus.uiComponents.tabsList.scrollLeft;
            this.velocity = 0;
            this.maxSpeed = 0; // Reset max speed for new gesture
            
            const tabsList = EdgeTabsPlus.uiComponents.tabsList;
            if (!tabsList) return;
            
            // Cancel any ongoing animations
            cancelAnimationFrame(this.momentumRAF);
            cancelAnimationFrame(this.scrollRAF);
            
            // Clean up transitions and prepare for new gesture
            tabsList.classList.remove('fast-scroll');
            tabsList.style.scrollBehavior = 'auto';
            tabsList.style.transition = 'none';
            
            // Reset after frame to ensure clean state
            requestAnimationFrame(() => {
                tabsList.style.transition = '';
            });
        },

onTouchMove(e) {
    if (!this.isDragging) return;
    
    const tabsList = EdgeTabsPlus.uiComponents.tabsList;
    if (!tabsList) return;
    
    const currentTime = performance.now();
    const x = e.touches[0].pageX;
    const deltaX = x - this.lastX;
    const deltaTime = currentTime - this.lastTime;
    
    // Skip if too soon (prevent oversampling)
    if (deltaTime < 4) return;
    
    // Pure velocity calculation without artificial boosting
    const instantSpeed = Math.abs(deltaX / deltaTime);
    
    // Ultra-responsive flick detection
    const isFlickGesture = instantSpeed > 0.3; // Much lower threshold to catch even gentle flicks
    
    if (isFlickGesture) {
        cancelAnimationFrame(this.scrollRAF);
        cancelAnimationFrame(this.momentumRAF);
        
        // Calculate velocity with speed scaling
        const baseVelocity = deltaX / deltaTime;
        const speedScale = Math.min(4.0, Math.max(2.0, Math.abs(baseVelocity))); // Dynamic scaling
        this.velocity = baseVelocity * speedScale;
        
        // Immediate position update for responsiveness
        const newScrollLeft = this.scrollLeft - (x - this.startX);
        const maxScroll = tabsList.scrollWidth - tabsList.clientWidth;
        const boundedScrollLeft = Math.max(0, Math.min(newScrollLeft, maxScroll));
        tabsList.scrollLeft = boundedScrollLeft;
    } else {
        // Normal scrolling for slower movements
        const newScrollLeft = this.scrollLeft - (x - this.startX);
        const maxScroll = tabsList.scrollWidth - tabsList.clientWidth;
        const boundedScrollLeft = Math.max(0, Math.min(newScrollLeft, maxScroll));
        
        this.scrollRAF = requestAnimationFrame(() => {
            tabsList.scrollLeft = boundedScrollLeft;
            this.velocity = deltaX / deltaTime;
        });
    }
    
    // Update tracking
    this.lastX = x;
    this.lastTime = currentTime;
    
    // Reset fast-scroll state after a delay
    if (this.fastScrollTimeout) {
        clearTimeout(this.fastScrollTimeout);
    }
    this.fastScrollTimeout = setTimeout(() => {
        tabsList.classList.remove('fast-scroll');
        tabsList.style.scrollBehavior = 'smooth';
    }, 100);
},

        onTouchEnd() {
            if (!this.isDragging) return;
            this.isDragging = false;
            
            const tabsList = EdgeTabsPlus.uiComponents.tabsList;
            if (!tabsList) return;
            
            const maxScroll = tabsList.scrollWidth - tabsList.clientWidth;
            // Calculate final flick velocity using the most recent movement
            const finalVelocity = Math.abs(this.velocity);
            const isFlick = finalVelocity > 1.5; // Lower threshold for flicks
            
            // Enhanced flick scrolling
            if (isFlick) {
                // Much higher boost for flicks
                this.velocity *= 3.0; // Triple the initial velocity
                
                tabsList.classList.add('fast-scroll');
                tabsList.style.scrollBehavior = 'auto';
                
                const flickMomentum = () => {
                    // Direct velocity application without frame timing for faster response
                    const newScrollLeft = tabsList.scrollLeft - (this.velocity * 20); // Increased multiplier
                    const boundedScrollLeft = Math.max(0, Math.min(newScrollLeft, maxScroll));
                    
                    tabsList.scrollLeft = boundedScrollLeft;
                    
                    // Variable deceleration based on speed
                    const currentSpeed = Math.abs(this.velocity);
                    if (currentSpeed > 3) {
                        this.velocity *= 0.98; // Very slow deceleration at high speeds
                    } else if (currentSpeed > 1) {
                        this.velocity *= 0.95; // Medium deceleration
                    } else {
                        this.velocity *= 0.9; // Faster deceleration at low speeds
                    }
                    
                    if (Math.abs(this.velocity) > 0.1 &&
                        boundedScrollLeft !== 0 &&
                        boundedScrollLeft !== maxScroll) {
                        this.momentumRAF = requestAnimationFrame(flickMomentum);
                    } else {
                        tabsList.classList.remove('fast-scroll');
                        this.snapToNearestTab(tabsList);
                    }
                };
                
                // Start fast momentum immediately
                fastMomentum();
            } else {
                // Normal snap behavior for slower movements
                this.snapToNearestTab(tabsList);
            }
        },
        
        snapToNearestTab(tabsList) {
            if (!tabsList) return;
            
            const tabWidth = tabsList.firstElementChild?.offsetWidth || 0;
            if (tabWidth > 0) {
                const currentScroll = tabsList.scrollLeft;
                const targetScroll = Math.round(currentScroll / tabWidth) * tabWidth;
                
                if (Math.abs(currentScroll - targetScroll) > 2) {
                    // Only snap if we're more than 2px away from target
                    const startPosition = currentScroll;
                    const distance = targetScroll - startPosition;
                    const duration = 150; // Short duration for snap
                    let startTime = null;
                    
                    const animate = (currentTime) => {
                        if (!startTime) startTime = currentTime;
                        const elapsed = currentTime - startTime;
                        const progress = Math.min(elapsed / duration, 1);
                        
                        // Easing function for smooth motion
                        const easeProgress = 1 - Math.pow(1 - progress, 3);
                        
                        const currentPosition = startPosition + (distance * easeProgress);
                        tabsList.scrollLeft = currentPosition;
                        
                        if (progress < 1) {
                            requestAnimationFrame(animate);
                        }
                    };
                    
                    requestAnimationFrame(animate);
                }
            }
        }
    };
})();