// Improve notifyTabsUpdated to target specific contexts
function notifyTabsUpdated() {
    chrome.tabs.query({ currentWindow: true }, (tabs) => {
        const tabData = tabs.map(tab => ({
            id: tab.id,
            title: tab.title || 'New Tab',
            active: tab.active,
            favIconUrl: tab.favIconUrl,
            url: tab.url
        }));
        console.log('Tabs Data:', tabData);
        console.log('Sending tabs data:', tabData); // Debug log
        
        // Send to all contexts
        chrome.tabs.query({}, allTabs => {
            allTabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, {
                    action: 'tabsUpdated',
                    tabs: tabData
                }).catch(err => console.log(`Failed to send to tab ${tab.id}:`, err));
            });
        });
    });
}

// Handle tab creation with delay and error handling
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch(request.action) {
        case 'closeTab':
            chrome.tabs.remove(request.tabId).then(notifyTabsUpdated);
            break;
        case 'activateTab':
            chrome.tabs.update(request.tabId, { active: true })
                .then(notifyTabsUpdated);
            break;
        case 'createTab':
            setTimeout(() => {
                try {
                    chrome.tabs.create({}).then(newTab => {
                        chrome.tabs.update(newTab.id, { active: true });
                        notifyTabsUpdated();
                    });
                } catch (error) {
                    console.error('Failed to create tab:', error);
                }
            }, 80);
            break;
        case 'getTabs':
            notifyTabsUpdated(); // Send tabs data when requested
            break;
        case 'getFaviconUrl': // New case for handling favicon URL requests
        chrome.tabs.get(request.tabId, (tab) => {
            if (tab && tab.favIconUrl) {
                sendResponse({ favIconUrl: tab.favIconUrl });
            } else {
                sendResponse({ favIconUrl: null });
            }
        });
        return true; // Required for asynchronous sendResponse
    }
});

// Step 4: Handle tab updates for favicon changes
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.favIconUrl) {
        console.log('Favicon updated for tab:', tabId, changeInfo.favIconUrl);
        notifyTabsUpdated();
    }
});

// Keep track of tabs
chrome.tabs.onCreated.addListener(notifyTabsUpdated);
chrome.tabs.onRemoved.addListener(notifyTabsUpdated);
chrome.tabs.onUpdated.addListener(notifyTabsUpdated);

// Add listeners for tab activation
chrome.tabs.onActivated.addListener(notifyTabsUpdated);
chrome.tabs.onAttached.addListener(notifyTabsUpdated);