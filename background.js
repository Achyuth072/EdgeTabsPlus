// Shared state
let sharedLastScrollPosition = 0;

// Helper to forward logs to all content scripts for Eruda
function forwardLogToContentScript(logString) {
    // Log that this function is being called (this specific log will NOT be forwarded, for safety)
    console.warn(`BG_META: forwardLogToContentScript attempting to process: ${logString.substring(0, 100)}...`); // Log to native console

    chrome.tabs.query({}, (tabs) => {
        // Log if tabs are found or not (this specific log will NOT be forwarded)
        console.warn(`BG_META: chrome.tabs.query found ${tabs ? tabs.length : 'no'} tabs.`);

        if (!tabs || tabs.length === 0) {
            // Log that no tabs were found to forward to (this specific log will NOT be forwarded)
            console.warn(`BG_META: No active tabs found to forward log: ${logString.substring(0,100)}...`);
            return;
        }

        tabs.forEach(tab => {
            // Log attempt to send to each tab (this specific log will NOT be forwarded)
            console.warn(`BG_META: Attempting to send to tab ${tab.id}: ${logString.substring(0,100)}...`);

            chrome.tabs.sendMessage(
                tab.id,
                { action: 'forwardLogToEruda', logEntry: logString }, // This is the original logString being forwarded
                () => {
                    if (chrome.runtime.lastError) {
                        // Log send error (this specific log will NOT be forwarded)
                        console.warn('BG_META: Error forwarding log to tab ' + tab.id + ':', chrome.runtime.lastError.message);
                    } else {
                        // Log successful send (this specific log will NOT be forwarded)
                        console.warn(`BG_META: Successfully sent to tab ${tab.id}: ${logString.substring(0,100)}...`);
                    }
                }
            );
        });
    });
}

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
        // LOG: Called sendUpdate with immediate flag
        forwardLogToContentScript(`BG: sendUpdate - Called. Immediate: ${immediate}`);
        chrome.tabs.query({ currentWindow: true }, (tabs) => {
            const tabData = tabs.map(tab => {
                // Detect if the title appears to be a URL
                let title = tab.title || 'New Tab';
                
                // Clean common search engine and site suffixes
                const originalTitle = title;
                if (tab.status === 'complete') {
                    // Clean up common suffixes for search engines and popular sites
                    title = title
                        .replace(/ at DuckDuckGo$/i, '')
                        .replace(/ - DuckDuckGo$/i, '')
                        .replace(/ - Google Search$/i, '')
                        .replace(/ - Bing$/i, '')
                        .replace(/ - Brave Search$/i, '')
                        .replace(/ - YouTube$/i, '')
                        .split(' - ')[0]
                        .trim();
                }
                
                // More comprehensive URL detection
                const isURLTitle = originalTitle.startsWith('http://') ||
                                   originalTitle.startsWith('https://') ||
                                   originalTitle.startsWith('www.') ||
                                   (tab.url && originalTitle === tab.url) ||
                                   // Check for domain-like patterns (containing domain TLDs)
                                   /\w+\.\w+\//.test(originalTitle) ||
                                   // Check if title contains domain suffixes
                                   /(\.com|\.org|\.net|\.io|\.co|\.edu|\.gov|\.wiki)/.test(originalTitle);
                
                // If the title is a URL or looks like one, use a placeholder
                // Also ensure status check works properly with both loaded and loading states
                if ((isURLTitle || originalTitle.includes('/')) && (tab.status !== 'complete')) {
                    title = 'Loading...';
                }
                
                return {
                    id: tab.id,
                    title: title,
                    active: tab.active,
                    favIconUrl: '', // Let content script handle favicon resolution
                    url: tab.url || '',  // Always include URL for favicon resolution
                    status: tab.status || '' // Include tab status
                };
            });
            // LOG: Sending tabs update to content scripts
            forwardLogToContentScript(`BG: sendUpdate - Sending tabs update to content scripts. Tab count: ${tabData.length}, Full data: ${JSON.stringify(tabData)}`);
            
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
    // LOG: onUpdated event data
    forwardLogToContentScript(`BG: chrome.tabs.onUpdated - Event data: ${JSON.stringify({ tabId, changeInfo, tab })}`);
    
    // For title or status changes, immediately update the tabstrip
    if (changeInfo.title || changeInfo.status) {
        const eventType = changeInfo.title ? 'title' : 'status';
        const value = changeInfo.title || changeInfo.status;
        forwardLogToContentScript(`BG: chrome.tabs.onUpdated - ${eventType} changed for tab ${tabId}: ${value}`);
        
        // Always update immediately for title changes or status='complete' changes
        // This ensures background tabs update their titles as soon as possible
        const immediate = true;
        
        // Special handling for meaningful title changes in background tabs
        const isNonLoadingTitle = changeInfo.title &&
                                  changeInfo.title !== 'Loading...' &&
                                  !changeInfo.title.startsWith('http://') &&
                                  !changeInfo.title.startsWith('https://');
        
        // Log the update reason for debugging
        let reason = '';
        if (changeInfo.status === 'complete') {
            reason = 'Tab completed loading';
        } else if (isNonLoadingTitle) {
            reason = 'Real title received for tab';
        } else if (changeInfo.title) {
            reason = 'Title changed';
        } else {
            reason = 'Other status change';
        }
        
        forwardLogToContentScript(`BG: Immediate update triggered - Reason: ${reason} for tab ${tabId}${tab.active ? ' (active)' : ' (background)'}`);
        
        notifyTabsUpdated(immediate);
        return;
    }
    
    // Specifically log favicon updates for debugging
    if (changeInfo.favIconUrl) {
        console.log('Favicon updated for tab:', tabId, changeInfo.favIconUrl);
    }
    
    // Debounce other types of updates
    notifyTabsUpdated();
});

// Keep track of tabs with error handling
const addTabListener = (event) => {
    chrome.tabs[event].addListener(() => {
        notifyTabsUpdated();
    });
};

// Set up tab event listeners
// Set up tab event listeners
chrome.tabs.onCreated.addListener((tab) => {
    // LOG: onCreated event data
    forwardLogToContentScript(`BG: chrome.tabs.onCreated - New tab data: ${JSON.stringify(tab)}`);
    notifyTabsUpdated(true); // Immediate update for new tabs
});
['onRemoved', 'onAttached', 'onActivated'].forEach(addTabListener);

// WebNavigation listeners to diagnose background tab creation issue
chrome.webNavigation.onCreatedNavigationTarget.addListener(function(details) {
    const logEntry = `BG_WEBNAV: onCreatedNavigationTarget - ${JSON.stringify(details)}`;
    forwardLogToContentScript(logEntry);
});

chrome.webNavigation.onCommitted.addListener(function(details) {
    // We're only interested in top-level frame navigations
    if (details.frameId === 0) {
        const logEntry = `BG_WEBNAV: onCommitted (main frame) - ${JSON.stringify(details)}`;
        forwardLogToContentScript(logEntry);
        notifyTabsUpdated(true); // Trigger update of the tabstrip
    }
});

// Log extension startup
console.log('EdgeTabs+ background script initialized');