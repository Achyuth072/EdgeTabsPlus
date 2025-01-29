(function() {
    window.EdgeTabsPlus = window.EdgeTabsPlus || {};

    EdgeTabsPlus.uiComponents = {
        strip: null,
        tabsList: null,
        addButton: null,
        addButtonContainer: null,

        init() {
            this.strip = this.createTabStrip();
            this.tabsList = this.createTabsList();
            this.addButtonContainer = this.createAddButtonContainer();
            this.addButton = this.createAddButton();
            this.setupStrip();
            return this;
        },

        createTabStrip() {
            const strip = document.createElement('div');
            strip.id = 'edgetabs-plus-strip';
            strip.style.position = 'fixed';
            strip.style.bottom = EdgeTabsPlus.config.tabStrip.bottomOffset;
            strip.style.left = '0';
            strip.style.width = '100%';
            strip.style.backgroundColor = EdgeTabsPlus.config.tabStrip.backgroundColor;
            strip.style.zIndex = '2147483647';
            strip.style.display = 'flex';
            strip.style.alignItems = 'center';
            strip.style.padding = '0 10px';
            strip.style.height = EdgeTabsPlus.config.tabStrip.height;
            strip.style.transition = `transform ${EdgeTabsPlus.config.scroll.transformDuration} ease-out`;
            strip.style.pointerEvents = 'none';
            strip.style.transform = 'translate3d(0,0,0)';
            return strip;
        },

        createTabsList() {
            const list = document.createElement('ul');
            list.id = 'tabs-list';
            list.style.pointerEvents = 'auto';
            list.style.touchAction = 'auto';
            list.style.listStyle = 'none';
            list.style.display = 'flex';
            list.style.margin = '0';
            list.style.padding = '0';
            list.style.overflowX = 'auto';
            list.style.width = '100%';
            return list;
        },

        createAddButtonContainer() {
            const container = document.createElement('div');
            container.className = 'add-tab-container';
            
            // Add the separator
            const separator = document.createElement('div');
            separator.className = 'add-tab-separator';
            separator.textContent = '|';
            separator.style.color = '#ddd';
            separator.style.margin = '0 8px';
            
            container.appendChild(separator);
            return container;
        },

        createAddButton() {
            const button = document.createElement('button');
            button.id = 'add-tab';
            button.innerHTML = '+';
            
            button.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                chrome.runtime.sendMessage({ action: 'createTab' });
            };

            return button;
        },

        setupStrip() {
            this.addButtonContainer.appendChild(this.addButton);
            this.strip.appendChild(this.tabsList);
            this.strip.appendChild(this.addButtonContainer);
            document.body.appendChild(this.strip);
        }
    };
})();