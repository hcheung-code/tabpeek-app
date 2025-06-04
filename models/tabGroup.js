// Tab Group Data Model
// Handles the structure and management of tab group data

class TabGroup {
    constructor(groupData) {
        this.id = groupData.id;
        this.title = groupData.title || 'Untitled Group';
        this.color = groupData.color;
        this.collapsed = groupData.collapsed || false;
        this.tabs = [];
    }

    // Add a tab to the group
    addTab(tab) {
        this.tabs.push({
            id: tab.id,
            title: tab.title,
            url: tab.url,
            favicon: tab.favIconUrl,
            pinned: tab.pinned || false,
            active: tab.active || false
        });
    }

    // Remove a tab from the group
    removeTab(tabId) {
        this.tabs = this.tabs.filter(tab => tab.id !== tabId);
    }

    // Update a tab's data
    updateTab(tabId, newData) {
        const tabIndex = this.tabs.findIndex(tab => tab.id === tabId);
        if (tabIndex !== -1) {
            this.tabs[tabIndex] = { ...this.tabs[tabIndex], ...newData };
        }
    }

    // Get tab count
    getTabCount() {
        return this.tabs.length;
    }

    // Check if group is empty
    isEmpty() {
        return this.tabs.length === 0;
    }
}

// Tab Group Manager to handle all tab groups
class TabGroupManager {
    constructor() {
        this.groups = new Map();
        this.initializeEventListeners();
    }

    // Initialize Chrome API event listeners
    initializeEventListeners() {
        // Listen for tab group updates
        chrome.tabGroups.onUpdated.addListener((tabGroupId, changeInfo, tabGroup) => {
            this.handleGroupUpdate(tabGroupId, changeInfo, tabGroup);
        });

        // Listen for tab updates
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            if (tab.groupId !== -1) {
                this.handleTabUpdate(tabId, changeInfo, tab);
            }
        });

        // Listen for tab group creation
        chrome.tabGroups.onCreated.addListener((tabGroup) => {
            this.handleGroupCreation(tabGroup);
        });

        // Listen for tab group removal
        chrome.tabGroups.onRemoved.addListener((tabGroup) => {
            this.handleGroupRemoval(tabGroup);
        });
    }

    // Handle tab group updates
    async handleGroupUpdate(tabGroupId, changeInfo, tabGroup) {
        const group = this.groups.get(tabGroupId);
        if (group) {
            Object.assign(group, changeInfo);
            this.notifyUpdate('TAB_GROUP_UPDATED', { tabGroupId, changeInfo, tabGroup });
        }
    }

    // Handle tab updates
    async handleTabUpdate(tabId, changeInfo, tab) {
        const group = this.groups.get(tab.groupId);
        if (group) {
            group.updateTab(tabId, changeInfo);
            this.notifyUpdate('TAB_UPDATED', { tabId, changeInfo, tab });
        }
    }

    // Handle tab group creation
    async handleGroupCreation(tabGroup) {
        const newGroup = new TabGroup(tabGroup);
        this.groups.set(tabGroup.id, newGroup);
        this.notifyUpdate('TAB_GROUP_CREATED', { tabGroup });
    }

    // Handle tab group removal
    async handleGroupRemoval(tabGroup) {
        this.groups.delete(tabGroup.id);
        this.notifyUpdate('TAB_GROUP_REMOVED', { tabGroup });
    }

    // Notify listeners of updates
    notifyUpdate(type, data) {
        chrome.runtime.sendMessage({ type, data });
    }

    // Get all tab groups with their tabs for a specific window
    async getAllGroups(windowId) {
        const groups = await chrome.tabGroups.query({ windowId });
        const groupsWithTabs = await Promise.all(
            groups.map(async (group) => {
                const tabs = await chrome.tabs.query({ groupId: group.id, windowId });
                const tabGroup = new TabGroup(group);
                tabs.forEach(tab => tabGroup.addTab(tab));
                return tabGroup;
            })
        );
        return groupsWithTabs;
    }

    // Get a specific tab group
    getGroup(groupId) {
        return this.groups.get(groupId);
    }
}

// Export the manager instance
export const tabGroupManager = new TabGroupManager(); 