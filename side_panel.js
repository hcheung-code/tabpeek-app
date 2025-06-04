// Import the tab group manager
import { tabGroupManager } from './models/tabGroup.js';

// DOM Elements
const col1 = document.getElementById('tab-groups-col-1');
const col2 = document.getElementById('tab-groups-col-2');
const ungroupedTabsContainer = document.getElementById('ungrouped-tabs-container');

let currentWindowId = null;

// Initialize the side panel
async function initializeSidePanel() {
    console.log('initializeSidePanel called');
    try {
        // Get the current window ID
        chrome.windows.getCurrent({populate: false}, async (currentWindow) => {
            currentWindowId = currentWindow.id;
            // Get all tab groups for the current window
            const groups = await tabGroupManager.getAllGroups(currentWindowId);
            // Sort groups by tab count descending
            groups.sort((a, b) => b.tabs.length - a.tabs.length);
            renderTabGroupsTwoColumns(groups);
            // Render ungrouped tabs for the current window
            renderUngroupedTabs(currentWindowId);
        });
    } catch (error) {
        console.error('Error initializing side panel:', error);
        showError('Failed to load tab groups');
    }
}

// Render tab groups in two columns
function renderTabGroupsTwoColumns(groups) {
    if (!col1 || !col2) return;
    col1.innerHTML = '';
    col2.innerHTML = '';
    // Split groups into two nearly equal columns
    const midpoint = Math.ceil(groups.length / 2);
    const col1Groups = groups.slice(0, midpoint);
    const col2Groups = groups.slice(midpoint);
    col1Groups.forEach(group => {
        const groupElement = createGroupElement(group);
        col1.appendChild(groupElement);
    });
    col2Groups.forEach(group => {
        const groupElement = createGroupElement(group);
        col2.appendChild(groupElement);
    });
}

// Create a group element
function createGroupElement(group) {
    const groupDiv = document.createElement('div');
    groupDiv.className = 'tab-group';
    groupDiv.dataset.groupId = group.id;
    groupDiv.dataset.color = group.color;

    // Group header with title and tab count
    const header = document.createElement('div');
    header.className = 'group-header';
    header.innerHTML = `
        <span class="group-title">${group.title}</span>
        <span class="tab-count">${group.getTabCount()}</span>
    `;

    // Tabs container (hidden by default, shown on hover)
    const tabsContainer = document.createElement('div');
    tabsContainer.className = 'tabs-container';
    
    // Add tabs to the container
    group.tabs.forEach(tab => {
        const tabElement = createTabElement(tab);
        tabsContainer.appendChild(tabElement);
    });

    // Assemble the group
    groupDiv.appendChild(header);
    groupDiv.appendChild(tabsContainer);

    return groupDiv;
}

// Create a tab element
function createTabElement(tab) {
    const tabDiv = document.createElement('div');
    tabDiv.className = 'tab-item';
    tabDiv.dataset.tabId = tab.id;

    // Create tab content with favicon and title
    tabDiv.innerHTML = `
        <img src="${tab.favicon || 'images/default-favicon.png'}" alt="" class="tab-favicon">
        <span class="tab-title">${tab.title}</span>
    `;

    // Add click handler to switch to the tab
    tabDiv.addEventListener('click', () => {
        console.log('Sending FOCUS_AND_ISOLATE_TAB', { tabId: tab.id, groupId: tab.groupId ?? -1 });
        chrome.runtime.sendMessage({
            type: 'FOCUS_AND_ISOLATE_TAB',
            data: { tabId: tab.id, groupId: tab.groupId ?? -1 }
        });
    });

    return tabDiv;
}

// Render ungrouped tabs for the current window
function renderUngroupedTabs(windowId) {
    if (!ungroupedTabsContainer) return;
    ungroupedTabsContainer.innerHTML = '';
    chrome.tabs.query({ windowId: windowId, groupId: -1 }, (tabs) => {
        tabs.forEach(tab => {
            const tabDiv = document.createElement('div');
            tabDiv.className = 'ungrouped-tab-item';
            tabDiv.innerHTML = `
                <img src="${tab.favIconUrl || 'images/default-favicon.png'}" alt="" class="tab-favicon">
                <span class="tab-title">${tab.title}</span>
            `;
            tabDiv.addEventListener('click', () => {
                chrome.runtime.sendMessage({
                    type: 'FOCUS_AND_ISOLATE_TAB',
                    data: { tabId: tab.id, groupId: -1 }
                });
            });
            ungroupedTabsContainer.appendChild(tabDiv);
        });
    });
}

// Show error message
function showError(message) {
    if (!col1 || !col2) return;
    col1.innerHTML = `
        <div class="error-message">
            <p>${message}</p>
        </div>
    `;
    col2.innerHTML = `
        <div class="error-message">
            <p>${message}</p>
        </div>
    `;
}

// Listen for tab group updates
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Background received message:', message);
    if (message.type === 'tabGroupsUpdated') {
        initializeSidePanel();
    }
});

// Listen for window focus changes and update the side panel
chrome.windows.onFocusChanged.addListener((windowId) => {
    if (windowId !== chrome.windows.WINDOW_ID_NONE) {
        initializeSidePanel();
    }
});

// Initialize when the side panel loads
document.addEventListener('DOMContentLoaded', initializeSidePanel); 