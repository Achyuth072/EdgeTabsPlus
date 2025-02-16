(function() {
    window.EdgeTabsPlus = window.EdgeTabsPlus || {};

    EdgeTabsPlus.styles = {
        init() {
            this.injectBaseStyles();
            this.injectTabWidthStyles();
            this.injectTabStateStyles();
            this.injectAdditionalStyles();
            return this;
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
                
                #edgetabs-plus-strip ul {
                    pointer-events: auto;
                    touch-action: pan-x;
                    overflow-x: auto;
                    overflow-y: hidden;
                    gap: 2px;
                    scroll-snap-type: none;  // Disable snap during scroll
                    scroll-behavior: auto;   // Let JS handle smooth scrolling
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
                    scroll-snap-align: start;
                    scroll-snap-stop: always;
                    transition: width 0.3s ease-out !important;
                    width: var(--tab-width, 180px) !important;
                    flex: 0 0 var(--tab-width, 180px) !important;
                }

                .close-tab {
                    position: absolute !important;
                    right: 2px !important;
                    top: 50% !important;
                    transform: translateY(-50%) !important;
                    width: 24px !important;
                    height: 24px !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    background: transparent !important;
                    border-radius: 50% !important;
                    font-size: 18px !important;
                    line-height: 1 !important;
                    color: #666 !important;
                    z-index: 1 !important;
                }

                .close-tab:hover {
                    background-color: rgba(0, 0, 0, 0.05) !important;
                    border-radius: 50% !important;
                    transition: background-color 0.2s ease !important;
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
                    transition: all 0.3s ease;
                }

                /* Dark theme variables */
                .dark-theme {
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

                /* Apply theme variables */
                #edgetabs-plus-strip {
                    background-color: var(--strip-bg) !important;
                    border-top: 1px solid var(--strip-border) !important;
                    box-shadow: 0 -2px 4px var(--strip-shadow) !important;
                    padding: 4px 8px !important;
                    transition: all 0.3s ease !important;
                }

                #edgetabs-plus-strip .tab-item {
                    background: var(--tab-bg) !important;
                    border: 1px solid var(--tab-border) !important;
                    box-shadow: 0 1px 2px var(--tab-shadow) !important;
                    margin: 2px !important;
                    transition: all 0.3s ease !important;
                    color: var(--tab-text) !important;
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
            `;
            document.head.appendChild(style);
        }
    };
})();