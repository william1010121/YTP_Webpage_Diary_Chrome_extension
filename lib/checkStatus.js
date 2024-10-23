// Function to check if a URL is a subpage of any Treasure Website
async function isTreasureSubpage(url) {
  const urlObj = new URL(url);
  const origin = urlObj.origin;

  return new Promise((resolve) => {
    chrome.storage.local.get(['treasureWebsites'], (result) => {
      const treasureWebsites = result.treasureWebsites || [];
      console.log('Treasure Websites:', treasureWebsites);
      resolve(treasureWebsites.includes(origin));
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

export { isTreasureSubpage, isAutoUploadEnabled };
