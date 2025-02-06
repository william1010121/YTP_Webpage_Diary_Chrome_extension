
import { saveURL, getProject, getProjectList, getProjectstructure, createNode} from './lib/backendApi.js';
import * as PageProcess from './lib/pageProcess.js';
import * as LLMApi from './lib/LLMApi.js';
import * as CHECK from './lib/checkStatus.js';
import * as LOCAL from './lib/localData.js';
// background.js
// Listen to tab updates
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    console.log('Tab Updated:', tabId, changeInfo, tab);
    const autoUpload = await CHECK.isAutoUploadEnabled();
    if (!autoUpload) {
      return; // Auto-upload is disabled
    }
    const isTreasure = await CHECK.isTreasureSubpage(tab.url);
    if (isTreasure) {
      const user = await LOCAL.getUser();
      const api = await LOCAL.getApi();
      if (!user) {
        console.warn('User not set. Cannot upload URL.');
        return;
      }
      if (!api) {
        console.warn('API not set. Cannot upload URL.');
        return;
      }
      PageProcess.summaryAndSaveCurrentPage(tab.url);
    }
  }
});


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // chrome.runtime.onMesssage with async https://stackoverflow.com/questions/44056271/chrome-runtime-onmessage-response-with-async-await
  (async () => {
    const { text, type } = request;
    const llmApiURL = await LOCAL.getllmApiURL();
    const llmApiKey = await LOCAL.getllmApiKey();
    const URL = `${llmApiURL}?key=${llmApiKey}`;
    console.log('type:',type);
    console.log('API:', llmApiURL);
    console.log('URL:',URL);
    if (text && llmApiURL && llmApiKey && type === 'gemini') {
      const response = await LLMApi.processTextGeminiAI(llmApiURL, llmApiKey, text);
      const title= await LLMApi.processTitleGeminiAI(llmApiURL, llmApiKey, text);
      sendResponse({
        "status": "success",
        "response": response,
        "title": title,
      });
    }
    else if (type === 'summary' && llmApiURL && llmApiKey) {
      await PageProcess.summaryCurrentPage(sendResponse);
    }
    else if( type == 'save_url') {
      const {url, projectId, nodeId, urlType } = request;
      await saveURL(url,"","", projectId, nodeId, urlType, sendResponse);
    }
    else if( type == 'save_url_content_title') {
      const { url, content, title, projectId, nodeId, urlType } = request;
      await saveURL(url, content, title, projectId, nodeId, urlType, sendResponse);
    }
    else if( type == 'insert_project') {
      const { project } = request;
      await getProject(project, sendResponse);
    }
    else if( type == 'get_projects') {
      await getProjectList(sendResponse);
    }
    else if( type == 'get_project_structure') {
      const { project } = request;
      await getProjectstructure(project, sendResponse);
    }
    else if( type == 'create_node') {
      const { projectId, nodeTitle} = request;
      await createNode(projectId, nodeTitle, sendResponse);
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


chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));
