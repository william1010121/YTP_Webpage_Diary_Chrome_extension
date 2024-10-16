// popup.js

document.addEventListener('DOMContentLoaded', () => {
  const saveUrlButton = document.getElementById('save-url');
  const summaryAndSaveURLButton = document.getElementById('summary-and-save-url');
  const markTreasureButton = document.getElementById('mark-treasure');
  const toggleAutoButton = document.getElementById('toggle-auto');
  const summaryButton = document.getElementById('summary');
  const apiInput = document.getElementById('api');
  const userInput = document.getElementById('user');
  const statusDiv = document.getElementById('status');
  const llmApiKey = document.getElementById('api-key');
  const llmApiURL = document.getElementById('api-url');
  const treasureList = document.getElementById('treasure-list');

  const inputText = document.getElementById('input-text'); 
  const titleText = document.getElementById('title-text');
  const outputText = document.getElementById('output-text');
  const submitButton = document.getElementById('SubmitInput');


  // list the treasure websites
  function updateTreasureList(treasureWebsites) {
    treasureList.value = treasureWebsites.join('\n');
  }

  chrome.storage.local.get(['treasureWebsites'], (result) => {
    const treasureWebsites = result.treasureWebsites || [];
    console.log('Treasure Websites:', treasureWebsites);
    updateTreasureList(treasureWebsites);
  });
    // Save treasure websites to storage on change
  treasureList.addEventListener('change', () => {
    const treasureWebsites = treasureList.value;
    console.log('Treasure Websites:', treasureWebsites);
    if (treasureWebsites) {
      chrome.storage.local.set({ treasureWebsites: treasureWebsites.trim().split('\n') }, () => {
        console.log('Treasure Websites saved:', treasureWebsites);
      });
    }
  });

  // Load saved user from storage if exists
  chrome.storage.local.get(['user'], (result) => {
    if (result.user) {
      userInput.value = result.user;
    }
  });

  // Save User Input to storage on change
  userInput.addEventListener('change', () => {
    const user = userInput.value.trim();
    if (user) {
      chrome.storage.local.set({ user }, () => {
        console.log('User saved:', user);
      });
    }
  });

  // Load API URL from storage if exists
  chrome.storage.local.get(['api'], (result) => {
    if (result.api) {
      apiInput.value = result.api;
    } else {
      const defaultAPI = "http://127.0.0.1:8000";
      apiInput.value = defaultAPI;
      chrome.storage.local.set({ api: defaultAPI }, () => {
        console.log('API saved:', defaultAPI);
      });
    }
  });

  // Save API URL to storage on change
  apiInput.addEventListener('change', () => {
    const api = apiInput.value.trim();
    if (api) {
      chrome.storage.local.set({ api }, () => {
        console.log('API saved:', api);
      });
    }
  });

  // Load API Key from storage if exists
  chrome.storage.local.get(['llmApiKey'], (result) => {
    if (result.llmApiKey) {
      llmApiKey.value = result.llmApiKey;
    } else {
      const defaultAPIKey = 'AIzaSyBqjdfVKLWdoG8eCuODdRz1__X4Bq3hPx8';
      llmApiKey.value = defaultAPIKey
      chrome.storage.local.set({ llmApiKey: defaultAPIKey }, () => {
        console.log('API Key saved:', defaultAPIKey);
      });
    }
  });

  // Save API Key to storage on change
  llmApiKey.addEventListener('change', () => {
    const key = llmApiKey.value.trim();
    if (key) {
      chrome.storage.local.set({ llmApiKey: key }, () => {
        console.log('API Key saved:', key);
      });
    }
  });

  // Load API URL from storage if exists
  chrome.storage.local.get(['llmApiURL'], (result) => {
    if (result.llmApiURL) {
      llmApiURL.value = result.llmApiURL;
    } else {
      const defaultAPIURL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent";
      llmApiURL.value = defaultAPIURL;
      chrome.storage.local.set({ llmApiURL: defaultAPIURL }, () => {
        console.log('API URL saved:', defaultAPIURL);
      });  
    }
  });

  // Save API URL to storage on change
  llmApiURL.addEventListener('change', () => {
    const api = llmApiURL.value.trim();
    if (api) {
      chrome.storage.local.set({ llmApiURL: api }, () => {
        console.log('API URL saved:', api);
      });
    }
  });

  submitButton.addEventListener('click', async () => {
    submitButton.disabled = true;
    outputText.textContent = 'Loading...';
    titleText.textContent = 'Loading...';
    const text = inputText.value.trim();
    callGeminiAPI(text, (response) => {
      if (response.status == "success") {
        outputText.textContent = response.response;
        titleText.textContent = response.title;
      } else {
        outputText.textContent = 'Error: Failed to get response.';
        titleText.textContent = 'Error: Failed to get title.';
      }
      submitButton.disabled = false;
    });
  });

  // Handle Save URL Button Click
  saveUrlButton.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const user = userInput.value.trim();
    const api = apiInput.value.trim();
    if (!user) {
      showStatus('Please enter a user.', true);
      return;
    }
    const url = tab.url;
    chrome.runtime.sendMessage({ url, type: 'save_url' }, (response) => {
      if(!response) {
        showStatus('Error: Failed to save URL.', true);
        return;
      }
      if( response.status === 'success') {
        showStatus('URL saved successfully.');
      }
      else {
        showStatus(`Error: ${response.message}`, true);
      }
    });
  });

  // Handle Save URL with Content Button Click
  summaryAndSaveURLButton.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const user = userInput.value.trim();
    const api = apiInput.value.trim();
    if (!user) {
      showStatus('Please enter a user.', true);
      return;
    }
    const url = tab.url;
    await summaryCurrentPage(url);
    const content = outputText.textContent;
    const title = titleText.textContent;
    console.log('Content:', content);
    console.log('URL:', url);
    chrome.runtime.sendMessage({ url, content, title, type: 'save_url_content_title' }, (response) => {
      if(!response) {
        showStatus('Error: Failed to save URL and Content.', true);
        return;
      }
      if( response.status === 'success') {
        showStatus('URL saved successfully.');
      }
      else {
        showStatus(`Error: ${response.message}`, true);
      }
    });
  });

  // Handle Mark as Treasure Website Button Click
  markTreasureButton.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = new URL(tab.url);
    const origin = url.origin;

    chrome.storage.local.get(['treasureWebsites'], (result) => {
      let treasureWebsites = result.treasureWebsites || [];
      if (!treasureWebsites.includes(origin)) {
        treasureWebsites.push(origin);
        chrome.storage.local.set({ treasureWebsites }, () => {
          showStatus('Marked as Treasure Website.');
        });
        updateTreasureList(treasureWebsites);
      } else {
        showStatus('This website is already a Treasure Website.', true);
      }
    });
  });

  // Handle Toggle Auto Upload Button Click
  toggleAutoButton.addEventListener('click', () => {
    chrome.storage.local.get(['autoUpload'], (result) => {
      const currentState = result.autoUpload || false;
      const newState = !currentState;
      chrome.storage.local.set({ autoUpload: newState }, () => {
        updateToggleButton(newState);
        const message = newState ? 'Auto Upload Enabled.' : 'Auto Upload Disabled.';
        showStatus(message);
      });
    });
  });

  // Handle Summary Button Click, get the summary of the current page
  // first get the whole page content and then call the Gemini API
  // By calling Gemini API and show the response on the output text
  summaryButton.addEventListener('click', async () => {
    await summaryCurrentPage();
  });

  async function summaryCurrentPage() {
    summaryButton.disabled = true;
    outputText.textContent = 'Loading...';
    titleText.textContent = 'Loading...';
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type: 'summary' }, (response) => {
        if (response && response.status === 'success') {
          outputText.textContent = response.response;
          titleText.textContent = response.title;
          resolve(response);
        } else {
          outputText.textContent = 'Error: Failed to get response.';
          titleText.textContent = 'Error: Failed to get title.';
          reject('Failed to get response.');
        }
        summaryButton.disabled = false;
      }
      );
    });
  };

  // Function to get the content of the current page
  function getPageText() {
    return document.body.innerText;
  }

  // Function to display status messages
  function showStatus(message, isError = false) {
    statusDiv.textContent = message;
    statusDiv.style.color = isError ? 'red' : 'green';
    setTimeout(() => {
      statusDiv.textContent = '';
    }, 3000);
  }
  // Function to update the toggle button label based on state
  function updateToggleButton(isEnabled) {
    toggleAutoButton.textContent = isEnabled ? 'Disable Auto Upload' : 'Enable Auto Upload';
  }

  // Function call Gemini AI API and get the response  
  // text: input text
  // response: need to be a function to handle the response
  function callGeminiAPI(text, response) {
    const api = llmApiURL.value.trim();
    const key = llmApiKey.value.trim();
    const type = 'gemini';
    chrome.runtime.sendMessage({ text, type}, response);
  }
});

