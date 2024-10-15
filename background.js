// background.js

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
    console.log('Tab Updated:', tabId, changeInfo, tab);
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
      summaryAndSaveCurrentPage(tab.url);
    }
  }
});


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // chrome.runtime.onMesssage with async https://stackoverflow.com/questions/44056271/chrome-runtime-onmessage-response-with-async-await
  (async () => {
    const { text, type } = request;
    const llmApiURL = await getllmApiURL();
    const llmApiKey = await getllmApiKey();
    const URL = `${llmApiURL}?key=${llmApiKey}`;
    console.log('type:',type);
    console.log('API:', llmApiURL);
    console.log('URL:',URL);
    if (text && llmApiURL && llmApiKey && type === 'gemini') {
      await processTextGeminiAI(llmApiURL, llmApiKey, text, sendResponse);
    }
    else if (type === 'summary' && llmApiURL && llmApiKey) {
      await summaryCurrentPage(sendResponse);
    }
    else if( type == 'save_url') {
      const { url } = request;
      await saveURL(url,"","this is the title", sendResponse);
    }
    else if( type == 'save_url_content') {
      const { url, content } = request;
      await saveURL(url, content, "this is the title", sendResponse);
    }
    else {
      console.error('Missing required fields.');
      sendResponse("Need to have text, api, and key");
    }
  })();
  return true;
});


async function processTextGeminiAI(api, key, text, sendResponse) {
  callGeminiApi(api,key,"Please generate a response to the following text:",text,sendResponse);
}

async function processsummaryGeminiAI(api, key, text, sendResponse) {
  callGeminiApi(api,key,"Please summarize the following text into a title:",text,sendResponse);
}

async function callGeminiApi(api,key,sysInstruction,contents,sendResponse){
  const URL = `${api}?key=${key}`;
  const data = {
    systemInstruction: {
      parts: [
        {
          text: sysInstruction
        }
      ]
    },
    contents: [{
      parts: [{
        text: contents
      }]
    }]
  };
  console.log('Data:', data);
  fetch(URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })
    .then(response => response.json())
    .then(data => {
      const generatedText = data.candidates[0].content.parts[0].text;
      console.log('Generated Text:', generatedText);
      sendResponse(generatedText);
    })
    .catch(() => {
      console.error('Failed to get response.');
      sendResponse(null);
    });
}

async function summaryCurrentPage(sendResponse) {
  const api = await getllmApiURL();
  const key = await getllmApiKey();
  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => { 
    chrome.scripting.executeScript({
      target: {tabId: tabs[0].id},
      function: pageText
    }, (results) => {
      const text = results[0].result;
      console.log('Page Text:', text);
      processTextGeminiAI(api, key, text, (response) => {
        sendResponse(response);
      });      
    });
  });
}

async function pageText() {
  return document.body.innerText;
}

async function saveURL(url, content, title, sendResponse) {
  const api = await getApi();
  const user = await getUser();
  if (!user) {
    console.error('User not set. Cannot save URL.');
    return;
  }
  if (!api) {
    console.error('API not set. Cannot save URL.');
    return;
  }

  const payload = { user, url, content };
  try {
     const response = await fetch(`${api}/api/uploads/url`, {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json'
       },
       body: JSON.stringify(payload)
     });

    if(response.ok) {
      sendResponse({ status: 'success', message: 'URL saved successfully.' });
    }
    else {
      const errorData = await response.json();
      sendResponse({ status: 'error', message: errorData.message });
    }
  } catch (error) {
    console.error('Error saving URL:', error);
    sendResponse({ status: 'error', message: 'Failed to save URL.' });
  }
}

async function summaryAndSaveCurrentPage(url) {
  summaryCurrentPage((content) => {
    saveURL(url, content, (response) => {
      if (response.status === 'success') {
        console.log('URL saved successfully.');
      } else {
        console.error('Failed to save URL:', response.message);
      }
    });
  });
}
