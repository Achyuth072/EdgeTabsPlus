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
                }
                
                #edgetabs-plus-strip ul {
                    pointer-events: auto;
                    touch-action: pan-x;
                    overflow-x: auto;
                    overflow-y: hidden;
                    gap: 2px;
                    scroll-snap-type: x mandatory;
                    scroll-behavior: smooth;        
                    -webkit-overflow-scrolling: touch;
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                    flex: 1;
                    margin: 0;
                    padding: 0;
                    display: flex;
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
                #edgetabs-plus-strip {
                    background-color: #f0f2f4 !important;
                    border-top: 1px solid rgba(0, 0, 0, 0.1) !important;
                    box-shadow: 0 -2px 4px rgba(0, 0, 0, 0.05) !important;
                    padding: 4px 8px !important;
                }

                #edgetabs-plus-strip .tab-item {
                    background: linear-gradient(to bottom, #ffffff, #f8f9fa) !important;
                    border: 1px solid rgba(0, 0, 0, 0.1) !important;
                    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05) !important;
                    margin: 2px !important;
                    transition: all 0.2s ease-out !important;
                }

                #edgetabs-plus-strip .tab-item.active {
                    background: #ffffff !important;
                    border: 1px solid rgba(0, 0, 0, 0.2) !important;
                    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1) !important;
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
                    background-color: #0078D4 !important;
                    border-radius: 2px 2px 0 0 !important;
                }

                #edgetabs-plus-strip .tab-item.active span:not(.close-tab) {
                    color: #000000 !important;
                    font-weight: 500 !important;
                }
            `;
            document.head.appendChild(style);
        }
    };
})();