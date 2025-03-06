(function() {
    window.EdgeTabsPlus = window.EdgeTabsPlus || {};

    EdgeTabsPlus.styles = {
        init() {
            // Critical: Insert theme protection style first, but make it less aggressive
            this.injectThemeProtection();
            this.injectBaseStyles();
            this.injectTabWidthStyles();
            this.injectTabStateStyles();
            this.injectScrollingStyles(); // Add scrolling specific styles
            this.injectAdditionalStyles();
            this.injectColorSchemeControl();
            return this;
        },

        // New method to protect against browser theme interference (less aggressive)
        injectThemeProtection() {
            const style = document.createElement('style');
            style.id = 'edgetabs-theme-protection';
            // Give it the highest priority
            style.setAttribute('data-priority', 'critical');
            style.textContent = `
                /* Forcefully prevent browser dark mode from affecting our theming */
                @media (prefers-color-scheme: dark) {
                    #edgetabs-plus-strip, #edgetabs-plus-strip * {
                        color-scheme: normal !important;
                    }
                }
                
                /* Essential override to prevent browser from imposing its theme */
                #edgetabs-plus-strip, .tab-item, .menu-container {
                    forced-colors: none !important;
                    forced-color-adjust: none !important;
                    -webkit-forced-color-adjust: none !important;
                    -ms-high-contrast-adjust: none !important;
                }
            `;
            // Insert at the beginning of the document to ensure it takes precedence
            const head = document.head || document.documentElement;
            if (head.firstChild) {
                head.insertBefore(style, head.firstChild);
            } else {
                head.appendChild(style);
            }
        },

        injectBaseStyles() {
            const style = document.createElement('style');
            style.textContent = `
                #edgetabs-plus-strip,
                #edgetabs-plus-strip *:not(.close-tab):not(#add-tab) {
                    pointer-events: auto;
                    touch-action: auto;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, system-ui, sans-serif !important;
                    font-size: 14px !important;
                    font-weight: normal !important;
                    letter-spacing: normal !important;
                    text-transform: none !important;
                    box-sizing: border-box !important;
                }
                
                #edgetabs-plus-strip {
                    min-height: 40px !important;
                    padding: 4px 8px !important;
                    transition: opacity 0.3s ease, transform 0.3s ease !important;
                    opacity: 1 !important;
                    transform: translateY(0) !important;
                    z-index: 9999999 !important;
                    display: flex !important;
                }

                #edgetabs-plus-strip.transitioning {
                    transition: opacity 0.3s ease, transform 0.3s ease, display 0s linear 0.3s !important;
                }

                #edgetabs-plus-strip:not(.visible) {
                    opacity: 0 !important;
                    transform: translateY(100%) !important;
                }

                /* Auto-hide behavior */
                #edgetabs-plus-strip {
                    transition: opacity 0.3s ease, transform 0.3s ease !important;
                    transform: translateY(0) !important;
                    opacity: 1 !important;
                    will-change: transform, opacity !important;
                }

                #edgetabs-plus-strip.hidden {
                    opacity: 0 !important;
                    transform: translateY(100%) !important;
                    pointer-events: none !important;
                }

                /* Disable transitions when auto-hide is disabled */
                #edgetabs-plus-strip:not(.auto-hide-enabled) {
                    transform: translateY(0) !important;
                    opacity: 1 !important;
                }
                
                /* Improved tabs list base styles */
                #edgetabs-plus-strip ul {
                    pointer-events: auto;
                    touch-action: pan-x;
                    overflow-x: auto;
                    overflow-y: hidden;
                    gap: 2px;
                    -webkit-overflow-scrolling: touch;
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                    flex: 1;
                    margin: 0;
                    padding: 0 8px;
                    display: flex;
                    max-width: 100%;
                    position: relative;
                    width: 100%;
                    will-change: transform;
                    transform: translate3d(0,0,0);
                    backface-visibility: hidden;
                    perspective: 1000;
                    overscroll-behavior-x: contain;
                    cursor: grab;
                }

                /* Add grabbing cursor when actively scrolling */
                #edgetabs-plus-strip ul.grabbing {
                    cursor: grabbing;
                }

                /* Hide scrollbars but keep functionality */
                #edgetabs-plus-strip ul::-webkit-scrollbar {
                    display: none;
                }

                /* Add tab button container */
                .add-tab-container {
                    display: flex;
                    align-items: center;
                    margin-left: 8px;
                    border-left: 1px solid #ddd;
                }

                /* Add tab button */
                #add-tab {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-left: 8px;
                    width: 28px;
                    height: 28px;
                    background: #f8f9fa;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    cursor: pointer;
                    color: #666;
                    font-size: 18px;
                    line-height: 1;
                }

                #add-tab:hover {
                    background: #fff;
                    color: #000;
                }

                .tab-item {
                    position: relative !important;
                    display: flex !important;
                    align-items: center !important;
                    padding: 8px 28px 8px 4px !important;
                    gap: 4px !important;
                    overflow: hidden !important;
                    border-radius: 8px !important;
                    justify-content: space-between !important;
                    transition: width 0.3s ease-out, transform 0.2s ease-out !important;
                    width: var(--tab-width, 180px) !important;
                    flex: 0 0 var(--tab-width, 180px) !important;
                }

                .close-tab {
                    position: absolute !important;
                    right: 1px !important;
                    top: 50% !important;
                    transform: translateY(-50%) !important;
                    width: 30px !important;
                    height: 30px !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    background: transparent !important;
                    border-radius: 50% !important;
                    font-size: 24px !important;
                    font-weight: 700 !important;
                    line-height: 1 !important;
                    color: #666 !important;
                    z-index: 1 !important;
                    cursor: pointer !important;
                    -webkit-tap-highlight-color: transparent !important;
                }

                .close-tab:hover {
                    background-color: rgba(0, 0, 0, 0.05) !important;
                    border-radius: 50% !important;
                    transition: background-color 0.2s ease !important;
                }

                /* Add active state for better touch feedback */
                .close-tab:active {
                    background-color: rgba(0, 0, 0, 0.1) !important;
                    transform: translateY(-50%) scale(0.95) !important;
                }

                /* Add feedback for tab clicks */
                .tab-item:active {
                    transform: scale(0.98) !important;
                    transition: transform 0.1s ease-out !important;
                }

                #log-overlay {
                    position: fixed;
                    bottom: 40px;
                    left: 0;
                    width: 100%;
                    background-color: rgba(0, 0, 0, 0.8);
                    color: white;
                    font-family: monospace;
                    font-size: 12px;
                    padding: 5px;
                    z-index: 2147483647;
                    overflow-y: auto;
                    max-height: 100px;
                    white-space: pre-wrap;
                    display: none;
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                }

                #log-toggle-button {
                    position: fixed;
                    bottom: 100px;
                    right: 10px;
                    z-index: 2147483647;
                    background-color: #0078D7;
                    color: white;
                    border: none;
                    border-radius: 50%;
                    width: 40px;
                    height: 40px;
                    cursor: pointer;
                    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
                    outline: none;
                }

                #log-toggle-button:active {
                    transform: scale(0.95);
                }
                
                /* Add a class for preventing text selection during drag */
                body.no-select {
                    user-select: none;
                    -webkit-user-select: none;
                }
            `;
            document.head.appendChild(style);
        },

        injectTabWidthStyles() {
            const style = document.createElement('style');
            style.textContent = `
                .tab-item {
                    width: var(--tab-width, 180px) !important;
                    min-width: auto !important;
                    max-width: none !important;
                    flex: 0 0 var(--tab-width, 180px) !important;
                    transition: width 0.3s ease-out, flex-basis 0.3s ease-out !important;
                }

                .tab-item.minimal {
                    width: 90px !important;
                    flex: 0 0 90px !important;
                }
                
                .tab-item.minimal div:not(.close-tab) {
                    max-width: 24px !important; /* Only show favicon */
                }
                
                .tab-item.minimal span:not(.close-tab) {
                    display: none !important; /* Hide text completely */
                }
            `;
            document.head.appendChild(style);
        },

        injectTabStateStyles() {
            const style = document.createElement('style');
            style.textContent = `
                .tab-item.single-tab {
                    min-width: 180px !important;
                    width: 180px !important;
                    max-width: 180px !important;
                    flex-basis: 180px !important;
                }

                .tab-item.single-tab span:not(.close-tab) {
                    opacity: 1 !important;
                    max-width: 140px !important;
                }

                .tab-item:not(.minimal):not(.single-tab) {
                    transition: width 0.3s ease-out !important;
                }

                .tab-item.minimal span:not(.close-tab) {
                    max-width: 50px !important;
                    opacity: 0.85 !important;
                }
            `;
            document.head.appendChild(style);
        },
        
        injectScrollingStyles() {
            const style = document.createElement('style');
            style.id = 'edgetabs-scrolling-styles';
            style.textContent = `
                /* Enhanced scrolling and touch interaction */
                .tabs-list {
                    scroll-snap-type: x proximity;
                    scroll-behavior: smooth;
                    -webkit-overflow-scrolling: touch;
                    overscroll-behavior-x: contain;
                    cursor: grab;
                }
                
                .tabs-list.grabbing {
                    cursor: grabbing !important;
                }
                
                /* Scroll snap alignment */
                .tab-item {
                    scroll-snap-align: center;
                    scroll-snap-stop: always;
                }
                
                /* Hover and focus effects for tab items */
                .tab-item:hover {
                    transform: translateY(-1px) scale(1.01);
                    box-shadow: 0 2px 8px var(--tab-shadow);
                    transition: transform 0.2s ease, box-shadow 0.2s ease;
                }
                
                .tab-item:active {
                    transform: translateY(0) scale(0.99);
                    transition: transform 0.1s ease;
                }
                
                /* Active tab styling enhancements */
                .tab-item.active {
                    transform: translateY(-2px) scale(1.03) !important;
                    transition: transform 0.2s ease-out, box-shadow 0.2s ease-out;
                    z-index: 10 !important;
                }
                
                /* Scroll progress indicators */
                .tabs-list::before,
                .tabs-list::after {
                    content: '';
                    position: absolute;
                    top: 0;
                    bottom: 0;
                    width: 20px;
                    opacity: 0;
                    transition: opacity 0.3s ease;
                    pointer-events: none;
                    z-index: 10;
                }
                
                .tabs-list::before {
                    left: 0;
                    background: linear-gradient(to right, var(--strip-bg), transparent);
                    opacity: 0;
                }
                
                .tabs-list::after {
                    right: 0;
                    background: linear-gradient(to left, var(--strip-bg), transparent);
                    opacity: 0;
                }
                
                .tabs-list.scroll-left::before {
                    opacity: 0.8;
                }
                
                .tabs-list.scroll-right::after {
                    opacity: 0.8;
                }
                
                /* Smooth animation for all transitions */
                @media (prefers-reduced-motion: no-preference) {
                    .tab-item, .tabs-list {
                        transition-duration: 0.25s;
                        transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
                    }
                }
                
                /* Add subtle bounce effect when reaching scroll limits */
                .tabs-list {
                    overscroll-behavior-x: contain;
                }
                
                /* Enhanced touch feedback */
                .tab-item {
                    -webkit-tap-highlight-color: transparent !important;
                    touch-action: pan-x !important;
                }
                
                /* Tab interaction feedback */
                .tab-item:active:not(.active) {
                    opacity: 0.85;
                    transform: scale(0.98);
                    transition: transform 0.1s ease-out, opacity 0.1s ease-out;
                }
                
                /* Active tab feedback */
                .tab-item.active:active {
                    transform: translateY(-1px) scale(0.99) !important;
                }
                
                /* Edge bounce effect for mobile */
                @supports (-webkit-overflow-scrolling: touch) {
                    .tabs-list {
                        padding: 0 16px;
                    }
                    
                    .tabs-list::before,
                    .tabs-list::after {
                        width: 30px; /* Wider gradient on mobile */
                    }
                    
                    /* Increase touch targets for mobile */
                    .close-tab {
                        width: 34px !important;
                        height: 34px !important;
                    }
                    
                    /* More pronounced active states for touch */
                    .tab-item:active {
                        opacity: 0.8;
                    }
                }
            `;
            document.head.appendChild(style);
            
            // Also add event listener to show scroll indicators
            setTimeout(() => {
                const tabsList = document.getElementById('tabs-list');
                if (tabsList) {
                    tabsList.addEventListener('scroll', () => {
                        const hasLeftScroll = tabsList.scrollLeft > 10;
                        const hasRightScroll = tabsList.scrollLeft < (tabsList.scrollWidth - tabsList.clientWidth - 10);
                        
                        tabsList.classList.toggle('scroll-left', hasLeftScroll);
                        tabsList.classList.toggle('scroll-right', hasRightScroll);
                    }, { passive: true });
                    
                    // Trigger initial check
                    const event = new Event('scroll');
                    tabsList.dispatchEvent(event);
                }
            }, 500);
        },

        injectAdditionalStyles() {
            const style = document.createElement('style');
            style.textContent = `
                /* Define theme variables */
                :root {
                    --strip-bg: #f0f2f4;
                    --strip-border: rgba(0, 0, 0, 0.1);
                    --strip-shadow: rgba(0, 0, 0, 0.05);
                    --tab-bg: linear-gradient(to bottom, #ffffff, #f8f9fa);
                    --tab-border: rgba(0, 0, 0, 0.1);
                    --tab-shadow: rgba(0, 0, 0, 0.05);
                    --tab-active-bg: #ffffff;
                    --tab-active-border: rgba(0, 0, 0, 0.2);
                    --tab-active-shadow: rgba(0, 0, 0, 0.1);
                    --tab-active-indicator: #0078D4;
                    --tab-text: #000000;
                    --tab-hover-bg: rgba(0, 0, 0, 0.05);
                    --add-btn-bg: #f8f9fa;
                    --add-btn-border: #ddd;
                    --add-btn-color: #666;
                    --add-btn-hover-bg: #fff;
                    --add-btn-hover-color: #000;
                    transition: all 0.3s ease;
                }

                /* Dark theme variables - make more specific for better override */
                html.dark-theme:not(.light-theme), 
                body.dark-theme:not(.light-theme),
                .dark-theme:root {
                    --strip-bg: #202124;
                    --strip-border: rgba(255, 255, 255, 0.1);
                    --strip-shadow: rgba(0, 0, 0, 0.2);
                    --tab-bg: linear-gradient(to bottom, #292a2d, #202124);
                    --tab-border: rgba(255, 255, 255, 0.1);
                    --tab-shadow: rgba(0, 0, 0, 0.2);
                    --tab-active-bg: #3c4043;
                    --tab-active-border: rgba(255, 255, 255, 0.2);
                    --tab-active-shadow: rgba(0, 0, 0, 0.3);
                    --tab-active-indicator: #8ab4f8;
                    --tab-text: #e8eaed;
                    --tab-hover-bg: rgba(255, 255, 255, 0.05);
                    --add-btn-bg: #292a2d;
                    --add-btn-border: #5f6368;
                    --add-btn-color: #e8eaed;
                    --add-btn-hover-bg: #3c4043;
                    --add-btn-hover-color: #ffffff;
                }

                /* Apply theme variables to tab strip */
                #edgetabs-plus-strip {
                    background-color: var(--strip-bg) !important;
                    border-top: 1px solid var(--strip-border) !important;
                    box-shadow: 0 -2px 4px var(--strip-shadow) !important;
                    padding: 4px 8px !important;
                    transition: all 0.3s ease !important;
                }

                /* Apply theme to tab items with increased specificity */
                #edgetabs-plus-strip .tab-item,
                html.dark-theme #edgetabs-plus-strip .tab-item,
                html.light-theme #edgetabs-plus-strip .tab-item {
                    background: var(--tab-bg) !important;
                    border: 1px solid var(--tab-border) !important;
                    box-shadow: 0 1px 2px var(--tab-shadow) !important;
                    margin: 2px !important;
                    transition: all 0.3s ease !important;
                    color: var(--tab-text) !important;
                }

                /* Apply theme to tab button with increased specificity */
                #add-tab,
                html.dark-theme #add-tab,
                html.light-theme #add-tab {
                    background: var(--add-btn-bg) !important;
                    border-color: var(--add-btn-border) !important;
                    color: var(--add-btn-color) !important;
                }

                #add-tab:hover {
                    background: var(--add-btn-hover-bg) !important;
                    color: var(--add-btn-hover-color) !important;
                }

                #edgetabs-plus-strip .tab-item:hover {
                    background: var(--tab-hover-bg) !important;
                }

                #edgetabs-plus-strip .tab-item.active {
                    background: var(--tab-active-bg) !important;
                    border: 1px solid var(--tab-active-border) !important;
                    box-shadow: 0 2px 6px var(--tab-active-shadow) !important;
                    position: relative !important;
                    z-index: 2 !important;
                    transform: translateY(-1px) scale(1.02) !important;
                }

                #edgetabs-plus-strip .tab-item.active::before {
                    content: '' !important;
                    position: absolute !important;
                    top: -1px !important;
                    left: -1px !important;
                    right: -1px !important;
                    height: 2px !important;
                    background-color: var(--tab-active-indicator) !important;
                    border-radius: 2px 2px 0 0 !important;
                }

                #edgetabs-plus-strip .tab-item.active span:not(.close-tab) {
                    color: var(--tab-text) !important;
                    font-weight: 500 !important;
                }

                /* Add tab container divider */
                .add-tab-container {
                    border-left-color: var(--tab-border) !important;
                }
                
                /* Close button styling */
                .close-tab {
                    color: var(--tab-text) !important;
                    opacity: 0.7;
                }
                
                .close-tab:hover {
                    opacity: 1;
                }
            `;
            document.head.appendChild(style);
        },
        
        injectColorSchemeControl() {
            const style = document.createElement('style');
            style.id = 'edgetabs-color-scheme-control';
            style.textContent = `
                /* Direct selectors for tab strip elements with !important */
                #edgetabs-plus-strip {
                    background-color: var(--strip-bg) !important;
                    color: var(--tab-text) !important;
                }
                
                .tab-item {
                    background: var(--tab-bg) !important;
                    color: var(--tab-text) !important;
                    border-color: var(--tab-border) !important;
                }
                
                /* Prevent theme transitioning issues */
                .theme-transitioning {
                    transition: none !important;
                }
                
                .theme-transitioning * {
                    transition: none !important;
                }
                
                /* Make sure any tab within light or dark theme is properly colored */
                html.dark-theme .tab-item,
                body.dark-theme .tab-item {
                    --tab-bg: linear-gradient(to bottom, #292a2d, #202124);
                    --tab-text: #e8eaed;
                    background: var(--tab-bg) !important;
                }
                
                html.light-theme .tab-item,
                body.light-theme .tab-item {
                    --tab-bg: linear-gradient(to bottom, #ffffff, #f8f9fa);
                    --tab-text: #000000;
                    background: var(--tab-bg) !important;
                }
            `;
            document.head.appendChild(style);
        }
    };
})();