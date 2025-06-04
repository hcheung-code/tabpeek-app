// background.js
// This file contains the background service worker logic for the Tabpeek extension.
// It will handle extension events, tab group API access, and communication with content scripts. 

import { tabGroupManager } from './models/tabGroup.js';

// Allows users to open the side panel by clicking on the action toolbar icon
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

// Notifies the side panel to refresh when tab or tab group events occur.
function notifySidePanel() {
  chrome.runtime.sendMessage({ type: 'tabGroupsUpdated' });
}

chrome.tabGroups.onCreated.addListener(notifySidePanel);
chrome.tabGroups.onRemoved.addListener(notifySidePanel);
chrome.tabGroups.onMoved.addListener(notifySidePanel);
chrome.tabGroups.onUpdated.addListener(notifySidePanel);

chrome.tabs.onCreated.addListener(notifySidePanel);
chrome.tabs.onRemoved.addListener(notifySidePanel);
chrome.tabs.onAttached.addListener(notifySidePanel);
chrome.tabs.onDetached.addListener(notifySidePanel);
chrome.tabs.onUpdated.addListener(notifySidePanel);

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'tabGroupsUpdated') {
    getTabGroups(renderTabGroups);
    console.log('Tab groups updated');
  }
});

// Listen for tab group updates
chrome.tabGroups.onUpdated.addListener((tabGroupId, changeInfo, tabGroup) => {
  // Notify side panel of tab group changes
  chrome.runtime.sendMessage({
    type: 'TAB_GROUP_UPDATED',
    data: { tabGroupId, changeInfo, tabGroup }
  });
});

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Only process if the tab is part of a group
  if (tab.groupId !== -1) {
    chrome.runtime.sendMessage({
      type: 'TAB_UPDATED',
      data: { tabId, changeInfo, tab }
    });
  }
});

// Listen for tab group creation
chrome.tabGroups.onCreated.addListener((tabGroup) => {
  chrome.runtime.sendMessage({
    type: 'TAB_GROUP_CREATED',
    data: { tabGroup }
  });
});

// Listen for tab group removal
chrome.tabGroups.onRemoved.addListener((tabGroup) => {
  chrome.runtime.sendMessage({
    type: 'TAB_GROUP_REMOVED',
    data: { tabGroup }
  });
});

// Listen for messages from the side panel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'GET_ALL_TAB_GROUPS':
      // Get all tab groups and their tabs using the manager
      tabGroupManager.getAllGroups().then(sendResponse);
      return true; // Required for async sendResponse

    case 'SWITCH_TAB':
      // Switch to the specified tab
      chrome.tabs.update(message.data.tabId, { active: true });
      break;

    case 'MOVE_TAB':
      // Move tab to a different group
      chrome.tabs.group({
        groupId: message.data.targetGroupId,
        tabIds: message.data.tabId
      });
      break;

    case 'FOCUS_AND_ISOLATE_TAB': {
      const { tabId, groupId } = message.data;
      // Activate the tab
      chrome.tabs.update(tabId, { active: true }, () => {
        // After activating, close all other tab groups
        chrome.tabGroups.query({}, (groups) => {
          groups.forEach((group) => {
            if (groupId === -1 || group.id !== groupId) {
              chrome.tabGroups.update(group.id, { collapsed: true });
            } else if (group.id === groupId) {
              chrome.tabGroups.update(group.id, { collapsed: false });
            }
          });
        });
      });
      break;
    }
  }
});