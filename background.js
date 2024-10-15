// background.js

// Function to check if a URL is a subpage of any Treasure Website
async function isTreasureSubpage(url) {
  const urlObj = new URL(url);
  const origin = urlObj.origin;

  return new Promise((resolve) => {
    chrome.storage.local.get(['treasureWebsites'], (result) => {
      const treasureWebsites = result.treasureWebsites || [];
      resolve(treasureWebsites.includes(origin));
    });
  });
}

// Function to get the stored user
async function getUser() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['user'], (result) => {
      resolve(result.user || null);
    });
  });
}

// Function to get the stored api
async function getApi() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['api'], (result) => {
      resolve(result.api || null);
    });
  });
}

// Function to check if auto-upload is enabled
async function isAutoUploadEnabled() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['autoUpload'], (result) => {
      resolve(result.autoUpload || false);
    });
  });
}

// Listen to tab updates
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const autoUpload = await isAutoUploadEnabled();
    if (!autoUpload) {
      return; // Auto-upload is disabled
    }
    const isTreasure = await isTreasureSubpage(tab.url);
    if (isTreasure) {
      const user = await getUser();
      const api = await getApi(); 
      if (!user) {
        console.warn('User not set. Cannot upload URL.');
        return;
      }
      if (!api) {
        console.warn('API not set. Cannot upload URL.');
        return;
      }

      const payload = { user, url: tab.url };

      try {
        const response = await fetch(`${api}/api/uploads/url`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          console.log('Auto-uploaded URL:', tab.url);
        } else {
          console.error('Failed to auto-upload URL:', response.statusText);
        }
      } catch (error) {
        console.error('Error auto-uploading URL:', error);
      }
    }
  }
});

