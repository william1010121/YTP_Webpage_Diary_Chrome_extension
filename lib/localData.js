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

async function getllmApiURL() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['llmApiURL'], (result) => {
      resolve(result.llmApiURL || null);
    });
  });
}

async function getllmApiKey() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['llmApiKey'], (
      result) => {
        resolve(result.llmApiKey || null);
      }
    );
  });
}



export { getUser, getApi, getllmApiURL, getllmApiKey };
