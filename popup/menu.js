// Initialize menu functionality
document.addEventListener('DOMContentLoaded', () => {
    console.log('Menu initializing...'); // Direct console logging for debugging

    // Get UI elements
    const toggleActions = document.querySelectorAll('.toggle-action');
    const themeToggle = document.getElementById('themeToggle');
    const buttons = {
        newTab: document.getElementById('newTabBtn'),
        closeTab: document.getElementById('closeTabBtn'),
        reload: document.getElementById('reloadBtn'),
        settings: document.getElementById('settingsBtn')
    };

    // Theme Management
    function setTheme(isDark) {
        document.body.classList.toggle('dark-theme', isDark);
        chrome.storage.sync.set({ isDarkMode: isDark });
        
        // Update theme toggle icon with animation
        const themeIcon = themeToggle.querySelector('i');
        themeIcon.textContent = isDark ? 'dark_mode' : 'light_mode';
        themeIcon.classList.add('rotate-out');
        
        // Trigger rotation animation
        setTimeout(() => {
            themeIcon.classList.remove('rotate-out');
            themeIcon.classList.add('rotate-in');
            // Remove animation classes after transition
            setTimeout(() => {
                themeIcon.classList.remove('rotate-in');
            }, 300);
        }, 150);

        // Add ripple effect
        const ripple = document.createElement('div');
        ripple.className = 'ripple';
        themeToggle.appendChild(ripple);
        setTimeout(() => ripple.remove(), 1000);
        
        // Broadcast theme change to all tabs via background script
        chrome.runtime.sendMessage({
            action: 'syncTheme',
            isDark: isDark
        });
        console.log('Theme updated:', isDark ? 'dark' : 'light');
    }

    // Toggle State Management
    function updateToggle(element, state) {
        const setting = element.dataset.setting;
        element.setAttribute('aria-checked', state);
        
        // Update storage and notify content script
        chrome.storage.sync.set({ [setting]: state === 'true' }, () => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: 'toggleUpdate',
                        key: setting,
                        value: state === 'true'
                    });
                }
            });
            console.log(`Toggle ${setting} updated:`, state);
        });
    }

    // Initialize toggle states
    function initToggles() {
        toggleActions.forEach(toggle => {
            const setting = toggle.dataset.setting;
            if (!setting) return;

            // Get current state
            chrome.storage.sync.get(setting, (result) => {
                const state = result[setting] !== undefined ? result[setting] : true;
                toggle.setAttribute('aria-checked', state);
                console.log(`Initialized toggle ${setting}:`, state);
            });

            // Add click handler
            toggle.addEventListener('click', () => {
                const newState = toggle.getAttribute('aria-checked') !== 'true';
                updateToggle(toggle, String(newState));
            });
        });
    }

    // Button click handlers
    if (buttons.newTab) {
        buttons.newTab.addEventListener('click', () => {
            console.log('Creating new tab...');
            chrome.runtime.sendMessage({ action: 'createTab' });
            window.close();
        });
    }

    if (buttons.closeTab) {
        buttons.closeTab.addEventListener('click', () => {
            console.log('Closing current tab...');
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]) chrome.tabs.remove(tabs[0].id);
                window.close();
            });
        });
    }

    if (buttons.reload) {
        buttons.reload.addEventListener('click', () => {
            console.log('Reloading current tab...');
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]) chrome.tabs.reload(tabs[0].id);
                window.close();
            });
        });
    }

    if (buttons.settings) {
        buttons.settings.addEventListener('click', () => {
            console.log('Opening settings...');
            chrome.runtime.openOptionsPage();
            window.close();
        });
    }

    // Theme toggle handler
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const isDark = !document.body.classList.contains('dark-theme');
            setTheme(isDark);
            console.log('Theme toggled:', isDark ? 'dark' : 'light');
        });
    }

    // Initialize
    chrome.storage.sync.get('isDarkMode', (result) => {
        const isDark = result.isDarkMode !== undefined ? result.isDarkMode : true;
        setTheme(isDark);
    });
    
    initToggles();
    console.log('Menu initialization complete');
});