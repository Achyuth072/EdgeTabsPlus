// Wait for EdgeTabsPlus namespace to be available
document.addEventListener('DOMContentLoaded', () => {
    const { tabManager, config, logger } = window.EdgeTabsPlus;

    // Initialize required modules
    logger.init();
    config.init();
    tabManager.init();

    // Get references to the DOM elements
    const addTabButton = document.getElementById('add-tab');
    const settingsBtn = document.getElementById('settings-btn');

    // Add tab button handler with long-press support
    let pressTimer;
    addTabButton.addEventListener('mousedown', () => {
        pressTimer = setTimeout(() => {
            // Long press - open menu
            chrome.action.openPopup();
        }, 500);
    });

    addTabButton.addEventListener('mouseup', () => {
        clearTimeout(pressTimer);
        // Quick click - just create new tab
        chrome.runtime.sendMessage({ action: 'createTab' });
    });

    addTabButton.addEventListener('mouseleave', () => {
        clearTimeout(pressTimer);
    });

    // Touch event support
    addTabButton.addEventListener('touchstart', (e) => {
        pressTimer = setTimeout(() => {
            chrome.action.openPopup();
        }, 500);
    });

    addTabButton.addEventListener('touchend', (e) => {
        clearTimeout(pressTimer);
        if (e.cancelable) {
            e.preventDefault();
            chrome.runtime.sendMessage({ action: 'createTab' });
        }
    });

    addTabButton.addEventListener('touchcancel', () => {
        clearTimeout(pressTimer);
    });

    // Settings button handler - opens new menu
    settingsBtn.addEventListener('click', () => {
        chrome.action.openPopup();
    });

    // Initial tab load
    chrome.tabs.query({ currentWindow: true }, (tabs) => {
        tabManager.renderTabs(tabs).catch(error => {
            logger.error('Failed to render initial tabs:', error);
        });
    });

    // Listen for tab updates
    chrome.runtime.onMessage.addListener((request) => {
        if (request.action === 'tabsUpdated') {
            tabManager.renderTabs(request.tabs).catch(error => {
                logger.error('Failed to render updated tabs:', error);
            });
        }
    });

    // Log successful initialization
    logger.addLog('Popup interface initialized successfully');
});