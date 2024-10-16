// background.js
const SystemInstruction = {
  "TITLE": 
`Generate a plain title summarizing the key concept or main theme from the provided text.

# Steps

1. Carefully read and comprehend the given text to identify its main theme or topic.
2. Extract the central idea or focus.
3. Formulate a concise and descriptive title that encapsulates the main theme without additional context or details.

# Output Format

- A single, plain title capturing the essence of the text.

# Notes

- Ensure the title is succinct and directly related to the core theme.
- Do not include any additional information or context from the text in your response.`,

  "SUMMARY":
  `please generate a summary of the following text:`
};
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
      const response = await processTextGeminiAI(llmApiURL, llmApiKey, text);
      const title= await processTitleGeminiAI(llmApiURL, llmApiKey, text);
      sendResponse({
        "status": "success",
        "response": response,
        "title": title,
      });
      sendResponse(response);
    }
    else if (type === 'summary' && llmApiURL && llmApiKey) {
      await summaryCurrentPage(sendResponse);
    }
    else if( type == 'save_url') {
      const { url } = request;
      await saveURL(url,"","", sendResponse);
    }
    else if( type == 'save_url_content_title') {
      const { url, content, title } = request;
      await saveURL(url, content, title, sendResponse);
    }
    else {
      console.error('Missing required fields.');
      sendResponse({
        "status": "error",
        "message": "Missing required fields."
      });
    }
  })();
  return true;
});


async function processTextGeminiAI(api, key, text) {
    return new Promise((resolve) => {
        callGeminiApi(api, key,SystemInstruction["SUMMARY"], text, (response) => {
            resolve(response);
        }
        );
    });
  //callGeminiApi(api,key,"Please generate a response to the following text:",text,sendResponse);
}

async function processTitleGeminiAI(api, key, text) {
  console.log("SystemInstruction[\"TITLE\"]",SystemInstruction["TITLE"]);
  return new Promise((resolve) => {
    callGeminiApi(api, key, SystemInstruction["TITLE"] , text, (response) => {
      resolve(response);
    });
  });
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
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => { 
    chrome.scripting.executeScript({
      target: {tabId: tabs[0].id},
      function: pageText
    }, async (results) => {
      const text = results[0].result;
      console.log('Page Text:', text);
      const content = await processTextGeminiAI(api, key, text);
      const title = await processTitleGeminiAI(api, key, content);
      sendResponse({
        "status": "success",
        "response": content,
        "title": title
      });
    });
  });
}

async function giveTitleToContent(content, sendResponse) {
  const api = await getllmApiURL();
  const key = await getllmApiKey();
  const title = await processTitleGeminiAI(api, key, content);
  return new Promise((resolve) => {
    resolve(title);
  });
};

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

  const payload = { user, url, content, title };
  console.log('Payload:', payload);
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
  const summary = new Promise((resolve) => {
    summaryCurrentPage((content) => {
      resolve(content);
    });
  });
  const { status, response, title } = await summary;
  saveURL(url, response, title, (response) => {
    if (response.status === 'success') {
      console.log('URL saved successfully.');
    } else {
      console.error('Failed to save URL:', response.message);
    }
  });
}
