// Improve notifyTabsUpdated to target specific contexts
function notifyTabsUpdated() {
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
                    tabs: tabData
                }).catch(err => {
                    // Only log actual errors, not disconnected port errors
                    if (!err.message.includes('receiving end does not exist')) {
                        console.error(`Failed to send to tab ${tab.id}:`, err);
                    }
                });
            });
        });
    });
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
        case 'closeTab':
            chrome.tabs.remove(request.tabId)
                .then(notifyTabsUpdated)
                .catch(error => console.error('Failed to close tab:', error));
            break;
        case 'activateTab':
            chrome.tabs.update(request.tabId, { active: true })
                .then(notifyTabsUpdated)
                .catch(error => console.error('Failed to activate tab:', error));
            break;
        case 'createTab':
            setTimeout(() => {
                chrome.tabs.create({})
                    .then(newTab => {
                        return chrome.tabs.update(newTab.id, { active: true });
                    })
                    .then(notifyTabsUpdated)
                    .catch(error => console.error('Failed to create tab:', error));
            }, 80);
            break;
        case 'getTabs':
            notifyTabsUpdated();
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
    // Always notify of updates to ensure we don't miss any changes
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