import * as LOCAL from './localData.js';
import * as LLMApi from './LLMApi.js';
import { saveURL } from './backendApi.js';
async function summaryCurrentPage(sendResponse) {
  const api = await LOCAL.getllmApiURL();
  const key = await LOCAL.getllmApiKey();
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => { 
    chrome.scripting.executeScript({
      target: {tabId: tabs[0].id},
      function: pageText
    }, async (results) => {
      const text = results[0].result;
      console.log('Page Text:', text);
      const content = await LLMApi.processTextGeminiAI(api, key, text);
      const title = await LLMApi.processTitleGeminiAI(api, key, content);
      sendResponse({
        "status": "success",
        "response": content,
        "title": title
      });
    });
  });
}

async function pageText() {
  return document.body.innerText;
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

export { summaryCurrentPage, summaryAndSaveCurrentPage };
