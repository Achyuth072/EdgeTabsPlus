// Configuration
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

// Create tab strip with fixed positioning but without scroll interference
const tabStrip = document.createElement('div');
tabStrip.id = 'tab-strip-extension'; // Unique ID
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
    #tab-strip-extension * {
        pointer-events: auto;
        touch-action: auto;
    }
    #tab-strip-extension ul {
        pointer-events: auto;
        touch-action: auto;
        overflow-x: auto;
        overflow-y: hidden;
    }
    html, body {
        overflow: auto !important;
        overscroll-behavior: auto !important;
        touch-action: auto !important;
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

// Tab creation handler
addTabButton.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    chrome.runtime.sendMessage({ action: 'createTab' });
};

// Simplified tab rendering
function renderTabs(tabs) {
    tabsList.innerHTML = '';
    tabs.forEach(tab => {
        const tabItem = document.createElement('li');
        tabItem.className = 'tab-item';
        tabItem.textContent = tab.title || 'New Tab';
        tabItem.style.padding = '2px 5px';
        tabItem.style.cursor = 'pointer';
        tabItem.style.height = '36px';
        tabItem.style.display = 'flex';
        tabItem.style.alignItems = 'center';
        
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