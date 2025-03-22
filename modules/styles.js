(function() {
    window.EdgeTabsPlus = window.EdgeTabsPlus || {};

    EdgeTabsPlus.styles = {
        init() {
            // Store styles to be injected into shadow DOM
            this.styles = {
                base: this.getBaseStyles(),
                tabWidth: this.getTabWidthStyles(),
                tabState: this.getTabStateStyles(),
                scrolling: this.getScrollingStyles(),
                additional: this.getAdditionalStyles(),
                colorScheme: this.getColorSchemeStyles()
            };
            
            // Add styles to document for theme variables
            this.injectThemeVariables();
            return this;
        },

        // Method to get complete styles for shadow DOM
        getStyles() {
            return `
                ${this.styles.base}
                ${this.styles.tabWidth}
                ${this.styles.tabState}
                ${this.styles.scrolling}
                ${this.styles.additional}
                ${this.styles.colorScheme}
            `;
        },

        // Only inject theme variables at document level
        injectThemeVariables() {
            const style = document.createElement('style');
            style.textContent = `
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
                }

                :root.dark-theme {
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
            `;
            document.head.appendChild(style);
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

        getBaseStyles() {
            return `
                :host {
                    display: block;
                }
                
                *, *::before, *::after {
                    box-sizing: border-box;
                }
                
                #edgetabs-plus-strip,
                #edgetabs-plus-strip *:not(.close-tab):not(#add-tab) {
                    pointer-events: auto;
                    touch-action: auto;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, system-ui, sans-serif;
                    font-size: 14px;
                    font-weight: normal;
                    letter-spacing: normal;
                    text-transform: none;
                }
                
                #edgetabs-plus-strip {
                    min-height: 40px;
                    padding: 4px 8px;
                    transition: opacity 0.3s ease, transform 0.3s ease;
                    opacity: 1;
                    transform: translateY(0);
                    z-index: 9999999;
                    display: flex;
                    position: fixed;
                    bottom: var(--strip-bottom-offset, 0);
                    left: 0;
                    width: 100%;
                    background-color: var(--strip-bg);
                    border-top: 1px solid var(--strip-border);
                    box-shadow: 0 -2px 4px var(--strip-shadow);
                }

                :host([hidden]) #edgetabs-plus-strip {
                    display: none;
                }

                #edgetabs-plus-strip.transitioning {
                    transition: opacity 0.3s ease, transform 0.3s ease, display 0s linear 0.3s;
                }

                #edgetabs-plus-strip:not(.visible) {
                    opacity: 0;
                    transform: translateY(100%);
                }

                /* Auto-hide behavior */
                #edgetabs-plus-strip {
                    transition: opacity 0.3s ease, transform 0.3s ease;
                    transform: translateY(0);
                    opacity: 1;
                    will-change: transform, opacity;
                }

                #edgetabs-plus-strip.hidden {
                    opacity: 0;
                    transform: translateY(100%);
                    pointer-events: none;
                }

                /* Disable transitions when auto-hide is disabled */
                :host([no-auto-hide]) #edgetabs-plus-strip {
                    transform: translateY(0);
                    opacity: 1;
                }
                
                /* Tabs list and scrolling */
                .tabs-list {
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
                .tabs-list.grabbing {
                    cursor: grabbing;
                }

                /* Hide scrollbars but keep functionality */
                .tabs-list::-webkit-scrollbar {
                    display: none;
                }

                /* Add tab button container */
                .add-tab-container {
                    display: flex;
                    align-items: center;
                    margin-left: 8px;
                    border-left: 1px solid var(--tab-border);
                }

                /* Add tab button with theme variables */
                #add-tab {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-left: 8px;
                    width: 28px;
                    height: 28px;
                    background: var(--add-btn-bg);
                    border: 1px solid var(--add-btn-border);
                    border-radius: 4px;
                    cursor: pointer;
                    color: var(--add-btn-color);
                    font-size: 18px;
                    line-height: 1;
                    transition: all 0.2s ease;
                }

                #add-tab:hover {
                    background: var(--add-btn-hover-bg);
                    color: var(--add-btn-hover-color);
                }

                #add-tab:active {
                    transform: scale(0.95);
                }

                /* Tab item styling */
                .tab-item {
                    position: relative;
                    height: 38px; /* Increased from 32px */
                    min-height: 38px; /* Increased from 32px */
                    margin: 1px 0; /* Center tabs vertically */
                    border-radius: 8px;
                    background: var(--tab-bg);
                    border: 1px solid var(--tab-border);
                    box-shadow: 0 1px 2px var(--tab-shadow);
                    color: var(--tab-text);
                    width: var(--tab-width, 180px);
                    flex: 0 0 var(--tab-width, 180px);
                    transition: all 0.2s ease-out;
                    overflow: hidden;
                }

                /* Adjust tabstrip padding to accommodate taller tabs */
                #edgetabs-plus-strip {
                    padding: 2px 8px; /* Reduced from 4px to maintain overall height */
                }
    
                .tab-content {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    height: 100%;
                    padding: 0 6px 0 10px; /* Adjusted padding for better spacing */
                    gap: 8px;
                }
    
                .tab-info {
                    display: flex;
                    align-items: center;
                    gap: 10px; /* Increased from 8px */
                    min-width: 0;
                    flex: 1;
                    height: 100%;
                }

                /* Adjust text size for better readability */
                .tab-title {
                    font-size: 13px; /* Increased from 12px */
                    line-height: 38px; /* Match tab height */
                    font-weight: 400;
                    letter-spacing: 0.01em;
                }

                /* Mobile optimizations */
                @media (pointer: coarse) {
                    .tab-content {
                        padding: 0 8px 0 12px; /* Larger padding for touch */
                    }

                    .tab-info {
                        gap: 12px; /* Larger gap for touch */
                    }
                }

                /* Tab hover effects */
                .tab-item:hover {
                    background: var(--tab-hover-bg);
                    transform: translateY(-1px);
                    box-shadow: 0 2px 4px var(--tab-shadow);
                }

                .tab-item:active {
                    transform: scale(0.98);
                }

                /* Close button container */
                .close-button-container {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 24px;
                    height: 24px;
                }
    
                /* Close button styling */
                .close-tab {
                    width: 20px;
                    height: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: transparent;
                    border: none;
                    border-radius: 50%;
                    padding: 0;
                    margin: 0;
                    font-size: 14px;
                    font-weight: 700;
                    line-height: 1;
                    color: var(--tab-text);
                    opacity: 0.7;
                    cursor: pointer;
                    -webkit-tap-highlight-color: transparent;
                    transition: all 0.2s ease;
                }
    
                .close-tab:hover {
                    opacity: 1;
                    background-color: var(--tab-hover-bg);
                }
    
                /* Touch feedback */
                .close-tab:active {
                    background-color: var(--tab-hover-bg);
                    transform: scale(0.95);
                }
    
                /* Ensure text doesn't overflow */
                .tab-title {
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    font-size: 12px;
                }
    
                /* Favicon sizing */
                .tab-favicon {
                    flex-shrink: 0;
                }

                /* Larger touch target for mobile */
                @media (pointer: coarse) {
                    .close-tab {
                        width: 24px;
                        height: 24px;
                    }

                    .close-tab::after {
                        content: '';
                        position: absolute;
                        top: -8px;
                        right: -8px;
                        bottom: -8px;
                        left: -8px;
                    }
                }

                .tab-item:active {
                    transform: scale(0.98);
                }

                /* Active tab styling */
                .tab-item.active {
                    background: var(--tab-active-bg);
                    border-color: var(--tab-active-border);
                    box-shadow: 0 2px 6px var(--tab-active-shadow);
                    transform: translateY(-1px) scale(1.02);
                    z-index: 2;
                }

                .tab-item.active::before {
                    content: '';
                    position: absolute;
                    top: -1px;
                    left: -1px;
                    right: -1px;
                    height: 2px;
                    background-color: var(--tab-active-indicator);
                    border-radius: 2px 2px 0 0;
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

        getTabWidthStyles() {
            return `
                /* Base tab dimensions */
                .tab-item {
                    width: var(--tab-width, 180px);
                    min-width: auto;
                    max-width: none;
                    flex: 0 0 var(--tab-width, 180px);
                    transition: width 0.3s ease-out, flex-basis 0.3s ease-out;
                }

                /* Minimal tab state */
                .tab-item.minimal {
                    width: 90px;
                    flex: 0 0 90px;
                }
                
                .tab-item.minimal div:not(.close-tab) {
                    max-width: 24px; /* Only show favicon */
                }
                
                .tab-item.minimal span:not(.close-tab) {
                    display: none; /* Hide text completely */
                }
            `;
        },

        getTabStateStyles() {
            return `
                /* Single tab state */
                .tab-item.single-tab {
                    min-width: 180px;
                    width: 180px;
                    max-width: 180px;
                    flex-basis: 180px;
                }

                .tab-item.single-tab span:not(.close-tab) {
                    opacity: 1;
                    max-width: 140px;
                }

                /* Regular tab states */
                .tab-item:not(.minimal):not(.single-tab) {
                    transition: width 0.3s ease-out;
                }

                /* Minimal state styles */
                .tab-item.minimal {
                    width: 90px;
                    flex: 0 0 90px;
                }

                .tab-item.minimal .tab-info {
                    justify-content: center;
                }

                .tab-item.minimal .tab-title {
                    display: none;
                }

                .tab-item.minimal .tab-favicon {
                    margin: 0;
                    width: 24px; /* Larger favicon for minimal state */
                    height: 24px;
                }

                /* Single tab state */
                .tab-item.single-tab {
                    width: 200px; /* Increased from 180px */
                    flex: 0 0 200px;
                }

                .tab-item.single-tab .tab-info {
                    flex: 1;
                }

                .tab-item.single-tab .tab-title {
                    max-width: none;
                    opacity: 1;
                }

                /* Active tab adjustments */
                .tab-item.active {
                    height: 40px; /* Slightly taller than regular tabs */
                    margin: 0; /* Remove margin to prevent jumping */
                    transform: translateY(-1px); /* Lift slightly */
                }

                .tab-item.active .tab-title {
                    opacity: 1;
                    font-weight: 500;
                }

                /* Touch device optimizations */
                @media (pointer: coarse) {
                    .tab-item.minimal .tab-favicon {
                        width: 28px; /* Even larger for touch devices */
                        height: 28px;
                    }
                }
            `;
        },
        
        getScrollingStyles() {
            return `
                /* Enhanced scrolling and touch interaction */
                .tabs-list {
                    scroll-snap-type: x proximity;
                    scroll-behavior: smooth;
                    -webkit-overflow-scrolling: touch;
                    overscroll-behavior-x: contain;
                    cursor: grab;
                }
                
                .tabs-list.grabbing {
                    cursor: grabbing;
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
                    transform: translateY(-2px) scale(1.03);
                    transition: transform 0.2s ease-out, box-shadow 0.2s ease-out;
                    z-index: 10;
                }

                /* Performance optimizations */
                .tabs-list, .tab-item {
                    will-change: transform;
                    backface-visibility: hidden;
                    -webkit-backface-visibility: hidden;
                }
                
                /* Scroll indicators with smooth transitions */
                .tabs-list {
                    position: relative;
                }

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
                    z-index: 2;
                }
                
                .tabs-list::before {
                    left: 0;
                    background: linear-gradient(to right, var(--strip-bg), transparent);
                }
                
                .tabs-list::after {
                    right: 0;
                    background: linear-gradient(to left, var(--strip-bg), transparent);
                }
                
                .tabs-list.scroll-left::before {
                    opacity: 0.8;
                }
                
                .tabs-list.scroll-right::after {
                    opacity: 0.8;
                }
                
                /* Motion preferences and animations */
                @media (prefers-reduced-motion: no-preference) {
                    .tab-item, .tabs-list {
                        transition-duration: 0.25s;
                        transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
                    }
                }

                @media (prefers-reduced-motion: reduce) {
                    .tab-item, .tabs-list {
                        transition-duration: 0.1s;
                    }
                }
                
                /* Touch optimizations */
                .tab-item {
                    -webkit-tap-highlight-color: transparent;
                    touch-action: pan-x;
                }
                
                /* Interactive states */
                .tab-item:active:not(.active) {
                    opacity: 0.85;
                    transform: scale(0.98);
                }
                
                .tab-item.active:active {
                    transform: translateY(-1px) scale(0.99);
                }
                
                /* Mobile optimizations */
                @supports (-webkit-overflow-scrolling: touch) {
                    .tabs-list {
                        padding: 0 16px;
                    }
                    
                    .tabs-list::before,
                    .tabs-list::after {
                        width: 30px;
                    }
                    
                    .close-tab {
                        width: 34px;
                        height: 34px;
                        min-width: 44px; /* Ensure minimum touch target size */
                        min-height: 44px;
                    }
                    
                    .tab-item:active {
                        opacity: 0.8;
                    }

                    /* Prevent rubber-banding on iOS */
                    .tabs-list {
                        overscroll-behavior-x: none;
                        -webkit-overflow-scrolling: touch;
                    }
                }

                /* High contrast mode support */
                @media (forced-colors: active) {
                    .tab-item {
                        border: 1px solid ButtonText;
                    }
                    
                    .tab-item.active {
                        border: 2px solid Highlight;
                    }
                }
            `;
        },

        getAdditionalStyles() {
            return `
                /* Host theme handling */
                :host {
                    color-scheme: light dark;
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
                }

                /* Dark theme via host attribute */
                :host([theme="dark"]) {
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

                /* Theme transitions */
                *, *::before, *::after {
                    transition: background-color 0.3s ease,
                              border-color 0.3s ease,
                              box-shadow 0.3s ease,
                              color 0.3s ease;
                }

                /* Disable transitions during theme changes */
                :host(.theme-transitioning) * {
                    transition: none !important;
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
        
        getColorSchemeStyles() {
            return `
                /* Adaptive color scheme based on host attribute */
                :host {
                    color-scheme: light dark;
                }

                /* Auto dark mode via system preference */
                @media (prefers-color-scheme: dark) {
                    :host(:not([theme="light"])) {
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
                    }
                }

                /* Forced light mode */
                :host([theme="light"]) {
                    --strip-bg: #f0f2f4;
                    --strip-border: rgba(0, 0, 0, 0.1);
                    --strip-shadow: rgba(0, 0, 0, 0.05);
                    --tab-bg: linear-gradient(to bottom, #ffffff, #f8f9fa);
                    --tab-border: rgba(0, 0, 0, 0.1);
                    --tab-shadow: rgba(0, 0, 0, 0.05);
                    --tab-text: #000000;
                }

                /* High contrast mode support */
                @media (forced-colors: active) {
                    :host {
                        forced-colors: none;
                    }

                    .tab-item {
                        border: solid 1px ButtonText;
                    }

                    .tab-item.active {
                        border: solid 2px Highlight;
                    }

                    .close-tab {
                        color: ButtonText;
                    }
                }
            `;
        }
    };
})();