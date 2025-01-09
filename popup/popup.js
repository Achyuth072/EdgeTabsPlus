// Get references to the DOM elements
const tabsList = document.getElementById('tabs-list');
const addTabButton = document.getElementById('add-tab');
const settingsBtn = document.getElementById('settings-btn');

// Function to create a new tab via background script
addTabButton.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'createTab' });
});

settingsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
});

// Function to render the list of tabs with error handling
function renderTabs(tabs) {
    try {
        tabsList.innerHTML = '';
        chrome.tabs.query({ currentWindow: true, active: true }, (activeTabs) => {
            const activeTabId = activeTabs[0]?.id;
            
            tabs.forEach(tab => {
                const tabItem = document.createElement('li');
                tabItem.className = 'tab-item';
                tabItem.textContent = tab.title || 'New Tab';
                
                if (tab.id === activeTabId) {
                    tabItem.classList.add('active');
                }

                const closeButton = document.createElement('span');
                closeButton.className = 'close-tab';
                closeButton.textContent = 'x';
                closeButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    chrome.tabs.remove(tab.id);
                });

                tabItem.addEventListener('click', () => {
                    chrome.tabs.update(tab.id, { active: true });
                });

                tabItem.appendChild(closeButton);
                tabsList.appendChild(tabItem);
            });
        });
    } catch (error) {
        console.error('Failed to render tabs:', error);
    }
}

// Initialize and listen for updates
chrome.tabs.query({ currentWindow: true }, renderTabs);
chrome.runtime.onMessage.addListener((request) => {
    if (request.action === 'tabsUpdated') {
        chrome.tabs.query({ currentWindow: true }, renderTabs);
    }
});