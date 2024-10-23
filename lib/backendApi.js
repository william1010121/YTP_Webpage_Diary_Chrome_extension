import * as LOCAL from './localData.js';
async function saveURL(url, content, title, sendResponse) {
  const api = await LOCAL.getApi();
  const user = await LOCAL.getUser();
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


export { saveURL };
