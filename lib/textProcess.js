import * as LOCAL from './local.js';
import * as LLMApi from './LLMApi.js';


async function giveTitleToContent(content, sendResponse) {
  const api = await LOCAL.getllmApiURL();
  const key = await LOCAL.getllmApiKey();
  const title = await LLMApi.processTitleGeminiAI(api, key, content);
  return new Promise((resolve) => {
    resolve(title);
  });
};

export { giveTitleToContent };
