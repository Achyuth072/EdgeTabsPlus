// Keep only essential configurations
const CONFIG = {
    scroll: {
        threshold: 50,
        debounceTime: 150,
        transformDuration: '0.3s'
    },
    tabStrip: {
        height: '40px',
        bottomOffset: '0px',
        backgroundColor: '#f1f1f1'
    }
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
toggleButton.textContent = '📜'; // Use an icon or text
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
// Remove problematic styles
// tabStrip.style.isolation = 'isolate';
// tabStrip.style.touchAction = 'none';
tabStrip.style.pointerEvents = 'none';
tabStrip.style.transform = 'translate3d(0,0,0)';

// Add scoped styles to prevent interference
const style = document.createElement('style');
style.textContent = `
    #edgetabs-plus-strip,
    #edgetabs-plus-strip * {
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
        display: flex !important;
        align-items: center !important;
    }
    
    #edgetabs-plus-strip ul {
        pointer-events: auto;
        touch-action: pan-x;
        overflow-x: auto;
        overflow-y: hidden;
        gap: 2px;  /* Reduce gap between tabs */
        scroll-snap-type: x mandatory;
        -webkit-overflow-scrolling: touch;
        flex: 1;
        margin: 0;
        padding: 0;
        display: flex;
    }
    .tab-item {
        scroll-snap-align: start;
        padding: 2px 8px; /* Increase horizontal padding */
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
addTabButton.textContent = '+';
addTabButton.style.pointerEvents = 'auto';
addTabButton.style.marginLeft = 'auto';
addTabButton.style.background = 'none';
addTabButton.style.border = 'none';
addTabButton.style.fontSize = '20px';
addTabButton.style.cursor = 'pointer';

// Update add tab button styles
addTabButton.style.marginLeft = 'auto';
addTabButton.style.flexShrink = '0';
addTabButton.style.width = '32px';
addTabButton.style.height = '32px';
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

// In content.js, add tab width calculation
function calculateTabWidth(tabCount) {
    const minWidth = 48; // More reasonable minimum width
    const maxWidth = 180; // Maximum width for better readability
    const screenWidth = window.innerWidth;
    const padding = 48; // Account for add button and margins
    const availableWidth = screenWidth - padding;
    const calculatedWidth = Math.floor(availableWidth / tabCount);
    return Math.min(maxWidth, Math.max(minWidth, calculatedWidth));
}

// Simplified tab rendering
function renderTabs(tabs) {
    const tabWidth = calculateTabWidth(tabs.length);
    tabsList.innerHTML = '';
    tabs.forEach(tab => {
        const tabItem = document.createElement('li');
        tabItem.className = 'tab-item';
        tabItem.style.width = `${tabWidth}px`;
        
        // Improved favicon handling
        const favicon = new Image();
        favicon.style.width = '16px';
        favicon.style.height = '16px';
        favicon.style.marginRight = '4px';
        favicon.style.flexShrink = '0';
        favicon.style.objectFit = 'contain';
        
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
        tabItem.appendChild(titleSpan);
        
        // Rest of your existing tab styling
        tabItem.style.padding = '2px 5px';
        tabItem.style.cursor = 'pointer';
        tabItem.style.height = '36px';
        tabItem.style.display = 'flex';
        tabItem.style.alignItems = 'center';
        tabItem.style.justifyContent = 'flex-start'; // Align items to start
        
        if (tab.active) {
            tabItem.style.backgroundColor = '#ddd';
        }
        
        const closeButton = document.createElement('span');
        closeButton.textContent = '×';
        closeButton.style.marginLeft = '5px';
        closeButton.onclick = (e) => {
            e.stopPropagation();
            chrome.runtime.sendMessage({ action: 'closeTab', tabId: tab.id });
        };
        
        tabItem.onclick = () => chrome.runtime.sendMessage({ 
            action: 'activateTab', 
            tabId: tab.id 
        });
        
        tabItem.appendChild(closeButton);
        tabsList.appendChild(tabItem);
    });
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
chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'tabsUpdated' && message.tabs) {
        renderTabs(message.tabs);
    }
});

// Request initial tabs
chrome.runtime.sendMessage({ action: 'getTabs' });

// Add touch scroll handling
function updateTouchScroll() {
    let startX;
    let scrollLeft;
    let isTabsDragging = false;
    let lastX;
    let velocity = 0;
    let animationFrame;

    tabsList.addEventListener('touchstart', (e) => {
        isTabsDragging = true;
        startX = e.touches[0].pageX;
        lastX = startX;
        scrollLeft = tabsList.scrollLeft;
        velocity = 0;
        cancelAnimationFrame(animationFrame);
    }, { passive: true });

    tabsList.addEventListener('touchmove', (e) => {
        if (!isTabsDragging) return;
        
        const x = e.touches[0].pageX;
        const dx = x - lastX;
        lastX = x;
        
        // Update velocity
        velocity = dx * 0.8 + velocity * 0.2;
        
        tabsList.scrollLeft = scrollLeft - (x - startX);
    }, { passive: true });

    tabsList.addEventListener('touchend', () => {
        if (!isTabsDragging) return;
        
        isTabsDragging = false;
        
        // Add momentum scrolling
        function momentum() {
            if (Math.abs(velocity) > 0.1) {
                tabsList.scrollLeft -= velocity;
                velocity *= 0.95;
                animationFrame = requestAnimationFrame(momentum);
            }
        }
        momentum();
    }, { passive: true });
}

// Call the updated touch scroll function
updateTouchScroll();