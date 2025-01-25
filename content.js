// Keep only essential configurations
const CONFIG = {
    scroll: {
        threshold: 50,
        debounceTime: 150,
        transformDuration: '0.3s'
    },
    tabStrip: {
        height: '44px',
        bottomOffset: '0px',
        backgroundColor: '#f1f1f1'
    }
};

// Add a setting for scroll behavior
const SETTINGS = {
    retainScrollPosition: true // Can be toggled in settings
};

// Step 1: Add Overlay HTML and CSS
// Create a logging overlay (hidden by default)
const logOverlay = document.createElement('div');
logOverlay.id = 'log-overlay';
logOverlay.style.display = 'none'; 
document.body.appendChild(logOverlay);

// Function to add logs to the overlay
function addLog(message) {
    const logEntry = document.createElement('div');
    logEntry.textContent = message;
    logOverlay.appendChild(logEntry);
    logOverlay.scrollTop = logOverlay.scrollHeight;
}

// Create a toggle button with Edge-like styling
const toggleButton = document.createElement('button');
toggleButton.id = 'log-toggle-button'; // Add an ID for styling
toggleButton.textContent = '📜';
document.body.appendChild(toggleButton);

// Toggle log overlay visibility
toggleButton.onclick = () => {
    logOverlay.style.display = logOverlay.style.display === 'none' ? 'block' : 'none';
};

// Function to get favicon URL with timeout
function getFaviconUrl(tabId, timeout = 2000) {
    return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
            clearTimeout(timeoutId);
            reject(new Error('Timeout'));
        }, timeout);
        chrome.runtime.sendMessage({ action: 'getFaviconUrl', tabId: tabId }, function(response) {
            clearTimeout(timeoutId);
            if (response && response.favIconUrl) {
                resolve(response.favIconUrl);
            } else {
                reject(new Error('No favicon URL available'));
            }
        });
    });
}

// Keep favicon cache for performance
const FAVICON_CACHE = new Map();

// Create tab strip with fixed positioning but without scroll interference
const tabStrip = document.createElement('div');
tabStrip.id = 'edgetabs-plus-strip'; // Unique ID
tabStrip.style.position = 'fixed';
tabStrip.style.bottom = CONFIG.tabStrip.bottomOffset;
tabStrip.style.left = '0';
tabStrip.style.width = '100%';
tabStrip.style.backgroundColor = CONFIG.tabStrip.backgroundColor;
tabStrip.style.zIndex = '2147483647';
tabStrip.style.display = 'flex';
tabStrip.style.alignItems = 'center';
tabStrip.style.padding = '0 10px';
tabStrip.style.height = CONFIG.tabStrip.height;
tabStrip.style.transition = `transform ${CONFIG.scroll.transformDuration} ease-out`;
tabStrip.style.pointerEvents = 'none';
tabStrip.style.transform = 'translate3d(0,0,0)';

// Add scoped styles to prevent interference
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
        gap: 2px;  /* Reduce gap between tabs */
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
        /* Remove width constraints - handled by CSS custom properties */
        width: var(--tab-width, 180px) !important;
        flex: 0 0 var(--tab-width, 180px) !important;
    }

    /* Add touch-friendly area */
    .tab-item::before {
        content: '';
        position: absolute !important;
        top: -8px !important;
        bottom: -8px !important;
        left: -4px !important;
        right: -4px !important;
        z-index: -1 !important;
    }

    /* Enhanced close button style */
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

    /* Add hover effect for close button */
    .close-tab:hover {
        background-color: rgba(0, 0, 0, 0.05) !important; /* More subtle */
        border-radius: 50% !important; /* Circular hover effect */
        transition: background-color 0.2s ease !important; /* Smooth transition */
    }

    /* Update title span style to prevent overlap */
    .tab-item span:not(.close-tab) {
        flex: 1 !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
        margin-right: 8px !important; /* Increased spacing before close button */
    }

    /* Enhanced add button style */
    #add-tab {
        min-width: 24px !important;
        min-height: 24px !important;
        font-size: 24px !important;
        font-weight: 700 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        margin-left: 8px !important;
        padding-left: 12px !important; /* Add padding after separator */
        padding-right: 12px !important; /* Balance padding */
        border-left: 1px solid #ddd !important; /* Vertical separator */
        border-radius: 0 !important; /* Remove rounded corners */
        background-color: #f1f1f1 !important;
    }

        /* Log Overlay Styles */
    #log-overlay {
        position: fixed;
        bottom: 40px; /* Position above the tab strip */
        left: 0;
        width: 100%;
        background-color: rgba(0, 0, 0, 0.8);
        color: white;
        font-family: monospace;
        font-size: 12px;
        padding: 5px;
        z-index: 2147483647; /* Highest possible z-index */
        overflow-y: auto;
        max-height: 100px;
        white-space: pre-wrap;
        display: none; /* Hidden by default */
        border-top: 1px solid rgba(255, 255, 255, 0.1); /* Add a subtle border */
    }

    /* Toggle Button Styles */
    #log-toggle-button {
        position: fixed;
        bottom: 100px;
        right: 10px;
        z-index: 2147483647;
        background-color: #0078D7; /* Edge's blue color */
        color: white;
        border: none;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        cursor: pointer;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
        outline: none; /* Remove focus outline */
    }

    #log-toggle-button:active {
        transform: scale(0.95); /* Add a slight press effect */
    }

    /* Hide text when tab is at minimum width */
    .tab-item.minimal span:not(.close-tab):not(img) {
        display: none !important;
    }

    #tabs-list {
        scroll-behavior: auto !important; /* Remove smooth scrolling for snappier response */
        -webkit-overflow-scrolling: touch !important;
        scroll-snap-type: none !important; /* Remove scroll snap for smoother scrolling */
        overflow-x: auto !important;
        /* ... rest of your existing styles ... */
    }
    
    /* When tab is at minimum width - updated to 90px */
    .tab-item.minimal {
        min-width: 90px !important;
        width: 90px !important;
        max-width: 90px !important;
        flex-basis: 90px !important;
        background-color: #f8f9fa !important;
    }

    /* Base tab styles with high specificity and enhanced transitions */
    #edgetabs-plus-strip .tab-item,
    #tabs-list .tab-item {
        width: var(--tab-width, 180px) !important;
        position: relative !important;
        display: flex !important;
        align-items: center !important;
        padding: 8px 28px 8px 8px !important;
        gap: 4px !important;
        overflow: hidden !important;
        flex: 0 0 var(--tab-width, 180px) !important;
        transform: translateZ(0) !important;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
        will-change: width, transform !important;
        contain: layout style size !important;
    }

    /* Single tab state */
    #edgetabs-plus-strip .tab-item.single-tab,
    #tabs-list .tab-item.single-tab {
        width: 180px !important;
        flex: 0 0 180px !important;
    }

    /* Minimal state (5+ tabs) */
    #edgetabs-plus-strip .tab-item.minimal,
    #tabs-list .tab-item.minimal {
        width: 90px !important;
        flex: 0 0 90px !important;
    }

    /* Enhanced title truncation with smooth transitions */
    #edgetabs-plus-strip .tab-item span:not(.close-tab) {
        flex: 1 !important;
        min-width: 0 !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        pointer-events: none !important;
        transition: opacity 0.3s ease-out !important;
        will-change: opacity, transform !important;
    }

    /* Minimal state styles with smoother transitions */
    #edgetabs-plus-strip .tab-item.minimal,
    #tabs-list .tab-item.minimal {
        width: 90px !important;
        min-width: 90px !important;
        max-width: 90px !important;
        padding-right: 24px !important;
        flex-basis: 90px !important;
    }

    /* Enhanced text fade for minimal state */
    #edgetabs-plus-strip .tab-item.minimal span:not(.close-tab) {
        opacity: 0.5 !important;
        transform: translateX(-5px) !important;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
    }

    /* Optimized favicon handling for minimal state */
    #edgetabs-plus-strip .tab-item.minimal img {
        margin-right: 0 !important;
        transform: translateX(4px) !important;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
    }

    /* Active tab emphasis */
    #edgetabs-plus-strip .tab-item.active {
        background-color: rgba(0, 0, 0, 0.05) !important;
    }
`;
document.head.appendChild(style);

// Create tabs list with pointer events enabled
const tabsList = document.createElement('ul');
tabsList.id = 'tabs-list';
tabsList.style.pointerEvents = 'auto';
tabsList.style.touchAction = 'auto';   // Allow touch events on tabs
tabsList.style.listStyle = 'none';
tabsList.style.display = 'flex';
tabsList.style.margin = '0';
tabsList.style.padding = '0';
tabsList.style.overflowX = 'auto';
tabsList.style.width = '100%';

// Create add button with pointer events enabled
const addTabButton = document.createElement('button');
addTabButton.id = 'add-tab'; // Add this line
addTabButton.innerHTML = '&#43;'; // Using HTML entity for plus sign
addTabButton.style.pointerEvents = 'auto';
addTabButton.style.marginLeft = 'auto';
addTabButton.style.background = 'none';
addTabButton.style.border = 'none';
addTabButton.style.cursor = 'pointer';

// Update add tab button styles
addTabButton.style.marginLeft = 'auto';
addTabButton.style.flexShrink = '0';
addTabButton.style.display = 'flex';
addTabButton.style.alignItems = 'center';
addTabButton.style.justifyContent = 'center';
addTabButton.style.backgroundColor = '#f1f1f1';
addTabButton.style.borderLeft = '1px solid #ddd';

// Tab creation handler
addTabButton.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    chrome.runtime.sendMessage({ action: 'createTab' });
};

function calculateTabWidth(tabCount) {
    const TAB_WIDTHS = {
        1: 180, // Single tab
        2: 160, // Two tabs
        3: 120, // Three tabs
        4: 100, // Four tabs
        5: 90   // Five or more tabs
    };

    // If we have more than 5 tabs, return the minimum width (90px)
    if (tabCount > 5) {
        return TAB_WIDTHS[5];
    }

    // Otherwise return the exact width for this number of tabs
    return TAB_WIDTHS[tabCount];
}

// Update tab width styling to match the spec
const tabWidthStyles = document.createElement('style');
tabWidthStyles.textContent = `
    /* Base tab styles - no minimum width constraint */
    .tab-item {
        width: var(--tab-width, 180px) !important;
        min-width: auto !important;
        max-width: none !important;
        flex: 0 0 var(--tab-width, 180px) !important;
        transition: width 0.3s ease-out, flex-basis 0.3s ease-out !important;
    }

    /* Remove any minimal width overrides */
    .tab-item.minimal {
        width: 90px !important;
        flex: 0 0 90px !important;
    }
`;
document.head.appendChild(tabWidthStyles);

function updateScrollSnapPoints() {
    const tabsList = document.getElementById('tabs-list');
    const tabs = tabsList.getElementsByClassName('tab-item');
    let snapPoints = '';
    
    Array.from(tabs).forEach((tab, index) => {
        const position = (tab.offsetWidth * index);
        snapPoints += `${position}px `;
    });
    
    tabsList.style.scrollSnapPoints = `x mandatory ${snapPoints}`;
}
window.addEventListener('resize', () => {
    updateScrollSnapPoints();
    updateMinimalTabs();
});

function updateMinimalTabs() {
    const tabs = document.querySelectorAll('.tab-item');
    const TAB_THRESHOLD = 5;
    
    tabs.forEach(tab => {
        // Remove both classes first
        tab.classList.remove('minimal', 'single-tab');
        
        // Apply appropriate class based on tab count
        if (tabs.length === 1) {
            tab.classList.add('single-tab');
        } else if (tabs.length >= TAB_THRESHOLD) {
            tab.classList.add('minimal');
        }
    });
}

// Add styles for different tab states
const tabStateStyles = document.createElement('style');
tabStateStyles.textContent = `
    /* Special tab width states with transitions */
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
document.head.appendChild(tabStateStyles);

// Add styles for better visual distinction
const additionalStyles = document.createElement('style');
additionalStyles.textContent = `
    /* Enhanced tab strip styles */
    #edgetabs-plus-strip {
        background-color: #f0f2f4 !important;
        border-top: 1px solid rgba(0, 0, 0, 0.1) !important;
        box-shadow: 0 -2px 4px rgba(0, 0, 0, 0.05) !important;
        padding: 4px 8px !important;
    }

    /* Base tab styles */
    #edgetabs-plus-strip .tab-item {
        background: linear-gradient(to bottom, #ffffff, #f8f9fa) !important;
        border: 1px solid rgba(0, 0, 0, 0.1) !important;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05) !important;
        margin: 2px !important;
        transition: all 0.2s ease-out !important;
    }

    /* Enhanced active tab styles */
    #edgetabs-plus-strip .tab-item.active {
        background: #ffffff !important;
        border: 1px solid rgba(0, 0, 0, 0.2) !important;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1) !important;
        position: relative !important;
        z-index: 2 !important;
        transform: translateY(-1px) scale(1.02) !important;
    }

    /* Active tab top border accent */
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

    /* Active tab text emphasis */
    #edgetabs-plus-strip .tab-item.active span:not(.close-tab) {
        color: #000000 !important;
        font-weight: 500 !important;
    }
`;
document.head.appendChild(additionalStyles);

// Tab rendering
function renderTabs(tabs) {
    const tabWidth = calculateTabWidth(tabs.length);
    const currentScrollPosition = tabsList.scrollLeft;
    let activeTabId = null;
    
    // Find active tab before rendering
    const activeTab = tabs.find(tab => tab.active);
    if (activeTab) {
        activeTabId = activeTab.id;
    }
    
    tabsList.innerHTML = '';
    
    tabs.forEach(tab => {
        const tabItem = document.createElement('li');
        tabItem.className = 'tab-item';
        tabItem.dataset.tabId = tab.id;
        
        // Set width using CSS custom property
        if (tabs.length === 1) {
            tabItem.classList.add('single-tab');
        } else if (tabs.length >= 5) {
            tabItem.classList.add('minimal');
        } else {
            // For 2-4 tabs, set exact width
            tabItem.style.setProperty('--tab-width', `${tabWidth}px`);
        }
        
        tabItem.style.minHeight = '40px';
        
        // Improved favicon handling
        const favicon = new Image();
        favicon.style.width = '20px'; // Increased from 16px
        favicon.style.height = '20px';
        favicon.style.marginRight = '8px'; // Increased spacing
        
        // Remove lazy loading for better stability
        favicon.decoding = 'sync';

        // Step 5: Ensure absolute favicon URLs
        if (tab.favIconUrl && !tab.favIconUrl.startsWith('http')) {
            tab.favIconUrl = new URL(tab.favIconUrl, tab.url).href;
            addLog(`Converted favicon URL to absolute: ${tab.favIconUrl}`);
        }

        // Enhanced favicon caching with tab URL as key
        const cacheKey = `${tab.id}-${tab.url}`;
        const cachedIcon = FAVICON_CACHE.get(cacheKey);
        
        // Step 3: Add enhanced error logging here
        // Handle Edge internal pages
        if (tab.url && tab.url.startsWith('edge://')) {
            addLog(`Edge internal page detected for tab: ${tab.id}`);
            favicon.src = chrome.runtime.getURL('icons/edge-logo.png');
            FAVICON_CACHE.set(cacheKey, chrome.runtime.getURL('icons/edge-logo.png'));
        } else if (cachedIcon) {
            addLog(`Using cached favicon for tab: ${tab.id} ${cachedIcon}`);
            favicon.src = cachedIcon;
        } else if (tab.favIconUrl) {
            addLog(`Loading favicon from: ${tab.favIconUrl}`);
            favicon.src = tab.favIconUrl;
            favicon.onerror = () => {
                addLog(`Failed to load favicon for tab: ${tab.id} ${tab.favIconUrl}`);
                const defaultIcon = chrome.runtime.getURL('icons/default-favicon.png');
                favicon.src = defaultIcon;
                FAVICON_CACHE.set(cacheKey, defaultIcon);
            };
            favicon.onload = () => {
                addLog(`Loaded favicon for tab: ${tab.id} ${tab.favIconUrl}`);
                FAVICON_CACHE.set(cacheKey, tab.favIconUrl);
            };
        } else {
            // Handle undefined tab.url
            if (tab.url) {
                addLog(`Tab URL for tab ${tab.id}: ${tab.url}`);
                const faviconServiceUrl = `https://icons.duckduckgo.com/ip3/${new URL(tab.url).hostname}.ico`;
                addLog(`Loading favicon from service: ${faviconServiceUrl}`);
                favicon.src = faviconServiceUrl;
                favicon.onerror = () => {
                    addLog(`Failed to load favicon from service for tab: ${tab.id}`);
                    const defaultIcon = chrome.runtime.getURL('icons/default-favicon.png');
                    favicon.src = defaultIcon;
                    FAVICON_CACHE.set(cacheKey, defaultIcon);
                };
                favicon.onload = () => {
                    addLog(`Loaded favicon from service for tab: ${tab.id} ${faviconServiceUrl}`);
                    FAVICON_CACHE.set(cacheKey, faviconServiceUrl);
                };
            } else {
                addLog(`Tab URL is undefined for tab: ${tab.id}`);
                const defaultIcon = chrome.runtime.getURL('icons/default-favicon.png');
                favicon.src = defaultIcon;
                FAVICON_CACHE.set(cacheKey, defaultIcon);
            }
        }


        // Improved title handling
        const titleSpan = document.createElement('span');
        titleSpan.style.overflow = 'hidden';
        titleSpan.style.textOverflow = 'ellipsis';
        titleSpan.style.whiteSpace = 'nowrap';
        titleSpan.style.flexGrow = '1';
        
        // Enhanced title cleaning
        let cleanTitle = tab.title;
        cleanTitle = cleanTitle
            .replace(/ at DuckDuckGo$/i, '')
            .replace(/ - DuckDuckGo$/i, '')
            .split(' - ')[0]
            .trim();
            
        titleSpan.textContent = cleanTitle || 'New Tab';

        // Append elements
        tabItem.appendChild(favicon);
        
        const titleContainer = document.createElement('div');
        titleContainer.style.flex = '1';
        titleContainer.style.minWidth = '0';
        titleContainer.style.overflow = 'hidden';
        titleContainer.appendChild(titleSpan);
        
        tabItem.appendChild(titleContainer);
        
        const closeButton = document.createElement('span');
        closeButton.innerHTML = '×'; // Using HTML entity for better rendering
        closeButton.className = 'close-tab';
        closeButton.style.marginLeft = '5px';
        closeButton.onclick = (e) => {
            e.stopPropagation();
            chrome.runtime.sendMessage({ action: 'closeTab', tabId: tab.id });
        };
        
        tabItem.onclick = () => handleTabClick(tab);
        
        if (tab.active) {
            tabItem.classList.add('active');
            // Defer scrolling to after render
            requestAnimationFrame(() => {
                scrollToActiveTab(tab.id);
            });
        }
        
        tabItem.appendChild(closeButton);
        tabsList.appendChild(tabItem);
    });
    
    updateMinimalTabs();
}

// Initialize
tabStrip.appendChild(tabsList);
tabStrip.appendChild(addTabButton);
document.body.appendChild(tabStrip);

// Simplified scroll handling
let lastScrollY = window.scrollY;
let isScrolling = false;

function handleScroll() {
    if (!isScrolling) {
        requestAnimationFrame(() => {
            const currentScrollY = window.scrollY;
            const scrollDelta = currentScrollY - lastScrollY;

            if (Math.abs(scrollDelta) > CONFIG.scroll.threshold) {
                requestAnimationFrame(() => {
                    tabStrip.style.transform = scrollDelta > 0 ? 
                        'translate3d(0,100%,0)' : 'translate3d(0,0,0)';
                });
                lastScrollY = currentScrollY;
            }
        });
    }
    isScrolling = false;
}

window.addEventListener('scroll', handleScroll, { passive: true });

// Message listener
let lastTabsState = null;

chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'tabsUpdated' && message.tabs) {
        // Compare with last state to prevent unnecessary updates
        const newState = JSON.stringify(message.tabs);
        if (newState !== lastTabsState) {
            lastTabsState = newState;
            renderTabs(message.tabs);
        }
    }
});

// Request initial tabs
chrome.runtime.sendMessage({ action: 'getTabs' });

// Optimized touch scroll handling with hardware acceleration
function setupTouchScroll() {
    let startX;
    let scrollLeft;
    let isDragging = false;
    let lastX;
    let lastTime;
    let velocity = 0;
    let momentumRAF;
    
    // Use transform for hardware acceleration
    tabsList.style.transform = 'translate3d(0,0,0)';
    tabsList.style.willChange = 'scroll-position';
    tabsList.style.overscrollBehavior = 'contain';
    
    function onTouchStart(e) {
        isDragging = true;
        startX = e.touches[0].pageX;
        lastX = startX;
        lastTime = Date.now();
        scrollLeft = tabsList.scrollLeft;
        velocity = 0;
        
        cancelAnimationFrame(momentumRAF);
        
        // Prepare for smooth scrolling
        tabsList.style.scrollBehavior = 'auto';
    }
    
    function onTouchMove(e) {
        if (!isDragging) return;
        
        const x = e.touches[0].pageX;
        const deltaX = x - lastX;
        const currentTime = Date.now();
        const deltaTime = currentTime - lastTime;
        
        // Calculate velocity (pixels per millisecond)
        if (deltaTime > 0) {
            velocity = (deltaX / deltaTime) * 1.5; // Increased sensitivity
        }
        
        // Update scroll position with hardware acceleration
        requestAnimationFrame(() => {
            tabsList.scrollLeft = scrollLeft - (x - startX);
        });
        
        lastX = x;
        lastTime = currentTime;
    }
    
    function onTouchEnd() {
        if (!isDragging) return;
        isDragging = false;
        
        // Enhanced momentum scrolling
        function momentum() {
            if (Math.abs(velocity) > 0.01) {
                requestAnimationFrame(() => {
                    tabsList.scrollLeft -= velocity * 16; // 16ms is approx. one frame
                    velocity *= 0.95; // Decay factor
                    momentumRAF = requestAnimationFrame(momentum);
                });
            } else {
                tabsList.style.scrollBehavior = 'smooth';
            }
        }
        
        if (Math.abs(velocity) > 0.1) {
            momentum();
        } else {
            tabsList.style.scrollBehavior = 'smooth';
        }
    }
    
    // Add event listeners with options for better performance
    tabsList.addEventListener('touchstart', onTouchStart, { passive: true });
    tabsList.addEventListener('touchmove', onTouchMove, { passive: true });
    tabsList.addEventListener('touchend', onTouchEnd, { passive: true });
    tabsList.addEventListener('touchcancel', onTouchEnd, { passive: true });
}

// Initialize touch scrolling
setupTouchScroll();

// Update scrollToActiveTab function for better position calculation
function scrollToActiveTab(tabId) {
    if (!SETTINGS.retainScrollPosition) return;
    
    const tabsList = document.getElementById('tabs-list');
    const activeTab = tabsList.querySelector(`[data-tab-id="${tabId}"]`);
    
    if (activeTab) {
        // Get current positions and dimensions
        const tabsListRect = tabsList.getBoundingClientRect();
        const tabRect = activeTab.getBoundingClientRect();
        const tabLeft = activeTab.offsetLeft;
        const tabWidth = activeTab.offsetWidth;
        const listWidth = tabsList.offsetWidth;
        const totalWidth = tabsList.scrollWidth;
        
        // Calculate the visible margins
        const leftMargin = Math.max(listWidth * 0.1, tabWidth); // At least one tab width or 10% of list
        const rightMargin = Math.max(listWidth * 0.1, tabWidth);
        
        let scrollPosition;
        
        // Calculate ideal center position
        const idealCenter = tabLeft - (listWidth - tabWidth) / 2;
        
        // Adjust position based on tab location
        if (tabLeft < leftMargin) {
            // Tab is near the start - align with left margin
            scrollPosition = Math.max(0, tabLeft - leftMargin);
        } else if (tabLeft + tabWidth > totalWidth - rightMargin) {
            // Tab is near the end - align with right margin
            scrollPosition = Math.min(
                totalWidth - listWidth,
                tabLeft - (listWidth - tabWidth - rightMargin)
            );
        } else {
            // Tab is in the middle - center it
            scrollPosition = idealCenter;
        }
        
        // Ensure scroll position is within bounds
        scrollPosition = Math.max(0, Math.min(scrollPosition, totalWidth - listWidth));
        
        // Apply scroll with smooth behavior
        tabsList.scrollTo({
            left: scrollPosition,
            behavior: 'smooth'
        });
    }
}

// Update tab click handler to ensure proper scroll timing
function handleTabClick(tab) {
    const tabId = tab.id;
    chrome.runtime.sendMessage({ 
        action: 'activateTab', 
        tabId: tabId 
    });
    
    // Use RAF for more reliable timing
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            scrollToActiveTab(tabId);
        });
    });
}