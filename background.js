// Shared state
let sharedLastScrollPosition = 0;

// Debounce helper
let notifyTimeout = null;
const DEBOUNCE_DELAY = 50; // 50ms debounce delay

// Improve notifyTabsUpdated to target specific contexts
function notifyTabsUpdated(immediate = false) {
    // Clear any pending timeout
    if (notifyTimeout) {
        clearTimeout(notifyTimeout);
    }

    const sendUpdate = () => {
        chrome.tabs.query({ currentWindow: true }, (tabs) => {
            const tabData = tabs.map(tab => ({
                id: tab.id,
                title: tab.title || 'New Tab',
                active: tab.active,
                favIconUrl: '', // Let content script handle favicon resolution
                url: tab.url || ''  // Always include URL for favicon resolution
            }));
            console.log('Sending tabs data:', tabData);
            
            // Send to all contexts using proper method
            chrome.tabs.query({}, allTabs => {
                allTabs.forEach(tab => {
                    // Fix: Use chrome.tabs.sendMessage instead of chrome.runtime.sendMessage
                    chrome.tabs.sendMessage(tab.id, {
                        action: 'tabsUpdated',
                        tabs: tabData,
                        sharedScrollPosition: sharedLastScrollPosition
                    }).catch(err => {
                        // Only log actual errors, not disconnected port errors
                        if (!err.message.includes('receiving end does not exist')) {
                            console.error(`Failed to send to tab ${tab.id}:`, err);
                        }
                    });
                });
            });
        });
    };

    // If immediate, send update now, otherwise debounce
    if (immediate) {
        sendUpdate();
    } else {
        notifyTimeout = setTimeout(sendUpdate, DEBOUNCE_DELAY);
    }
}

// Handle favicon URL requests with minimal processing
async function getFaviconUrl(tabId) {
    try {
        const tab = await chrome.tabs.get(tabId);
        // Return both URL and favIconUrl to let content script handle resolution
        return { 
            url: tab.url || '',
            favIconUrl: tab.favIconUrl || ''
        };
    } catch (error) {
        console.error('Error getting favicon URL:', error);
        return { url: '', favIconUrl: '' };
    }
}

// Handle tab creation with delay and error handling
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch(request.action) {
        case 'UPDATE_SCROLL_POSITION':
            sharedLastScrollPosition = request.position;
            break;
        case 'closeTab':
            chrome.tabs.remove(request.tabId)
                .then(() => notifyTabsUpdated())
                .catch(error => console.error('Failed to close tab:', error));
            break;
        case 'activateTab':
            chrome.tabs.update(request.tabId, { active: true })
                .then(() => notifyTabsUpdated())
                .catch(error => console.error('Failed to activate tab:', error));
            break;
        case 'createTab':
            setTimeout(() => {
                chrome.tabs.create({ url: 'about:newtab' })
                    .then(newTab => {
                        // Only update active state
                        return chrome.tabs.update(newTab.id, {
                            active: true
                        });
                    })
                    .then(() => notifyTabsUpdated(true)) // Immediate update for new tabs
                    .catch(error => console.error('Failed to create tab:', error));
            }, 80);
            break;
        case 'getTabs':
            notifyTabsUpdated(true); // Immediate update for initial load
            break;
        case 'getFaviconUrl':
            if (request.tabId) {
                getFaviconUrl(request.tabId)
                    .then(sendResponse)
                    .catch(error => {
                        console.error('Failed to get favicon URL:', error);
                        sendResponse({ url: '', favIconUrl: '' });
                    });
                return true; // Required for asynchronous sendResponse
            }
            break;
        
        case 'syncTheme':
            console.log('Broadcasting theme change:', request.isDark);
            // Broadcast theme change to all tabs
            chrome.tabs.query({}, allTabs => {
                Promise.all(allTabs.map(tab => {
                    return chrome.tabs.sendMessage(tab.id, {
                        action: 'updateTheme',
                        isDark: request.isDark
                    }).catch(err => {
                        // Only log non-disconnected port errors
                        if (!err.message.includes('receiving end does not exist')) {
                            console.error(`Failed to sync theme to tab ${tab.id}:`, err);
                        }
                        // Return null for failed updates
                        return null;
                    });
                })).then(results => {
                    // Log successful updates
                    const successCount = results.filter(r => r && r.success).length;
                    console.log(`Theme sync completed. Updated ${successCount}/${allTabs.length} tabs`);
                });
            });
            // Send immediate response
            if (sendResponse) {
                sendResponse({ success: true });
            }
            return true; // Keep message channel open
    }
});

// Enhanced tab update handling
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // Specifically log favicon updates for debugging
    if (changeInfo.favIconUrl) {
        console.log('Favicon updated for tab:', tabId, changeInfo.favIconUrl);
    }
    
    // Debounce updates
    notifyTabsUpdated();
});

// Keep track of tabs with error handling
const addTabListener = (event) => {
    chrome.tabs[event].addListener(() => {
        notifyTabsUpdated();
    });
};

// Set up tab event listeners
['onCreated', 'onRemoved', 'onAttached', 'onActivated'].forEach(addTabListener);

// Log extension startup
console.log('EdgeTabs+ background script initialized');