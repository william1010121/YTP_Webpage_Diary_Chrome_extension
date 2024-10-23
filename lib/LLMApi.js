import { SystemInstruction } from './PROMPT.js';

async function callGeminiApi(api,key,sysInstruction,contents,sendResponse){
  const URL = `${api}?key=${key}`;
  const data = {
    systemInstruction: {
      parts: [
        {
          text: sysInstruction
        }
      ]
    }, contents: [{
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



export { processTextGeminiAI, processTitleGeminiAI };
