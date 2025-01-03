import * as LOCAL from './localData.js';
async function saveURL(url, content, title, projectId, nodeId, urlType, sendResponse) {
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

  const payload = { user, projectId, nodeId, urlType, url, content, title };
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

async function getProject(projectId, sendResponse) {
  const user = await LOCAL.getUser();
  const api = await LOCAL.getApi();
  if (!user) {
    console.error('User not set. Cannot get project.');
    sendResponse({ status: 'error', message: 'User not set. Cannot get project.' });
    return;
  }
  if (!api) {
    console.error('API not set. Cannot get project.');
    sendResponse({ status: 'error', message: 'API not set. Cannot get project.' });
    return;
  }
  const payload = { user, projectId };
  try {
    const response = await fetch(`${api}/api/get_structure`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if(response.ok) {
      const projectData = await response.json();
      sendResponse({ status: 'success', project: projectData });
    }
    else {
      const errorData = await response.json();
      sendResponse({ status: 'error', message: errorData.message });
    }
  } catch (error) {
    console.error('Error getting project:', error);
    sendResponse({ status: 'error', message: 'Failed to get project.' });
  }
}

async function getProjectList(sendResponse) {
  const user = await LOCAL.getUser();
  const api = await LOCAL.getApi();
  if (!user) {
    console.error('User not set. Cannot get project list.');
    sendResponse({ status: 'error', message: 'User not set. Cannot get project list.' });
    return;
  }
  if (!api) {
    console.error('API not set. Cannot get project list.');
    sendResponse({ status: 'error', message: 'API not set. Cannot get project list.' });
    return;
  }
  const payload = { user };
  try {
    const response = await fetch(`${api}/api/get_project_list`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if(response.ok) {
      const projectList = await response.json();
      sendResponse({ status: 'success', projectList });
    }
    else {
      const errorData = await response.json();
      sendResponse({ status: 'error', message: errorData.message });
    }
  } catch (error) {
    console.error('Error getting project list:', error);
    sendResponse({ status: 'error', message: 'Failed to get project list.' });
  }
}


async function getProjectstructure(projectId,sendResponse) {
  const user = await LOCAL.getUser();
  const api = await LOCAL.getApi();
  if (!user) {
    console.error('User not set. Cannot get project list.');
    sendResponse({ status: 'error', message: 'User not set. Cannot get project list.' });
    return;
  }
  if (!api) {
    console.error('API not set. Cannot get project list.');
    sendResponse({ status: 'error', message: 'API not set. Cannot get project list.' });
    return;
  }
  const payload = { user, projectId };
   try {
    const response = await fetch(`${api}/api/get_structure`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if(response.ok) {
      const projectStructure= await response.json();
      sendResponse({ status: 'success', projectStructure});
    }
    else {
      const errorData = await response.json();
      sendResponse({ status: 'error', message: errorData.message });
    }
  } catch (error) {
    console.error('Error getting project list:', error);
    sendResponse({ status: 'error', message: 'Failed to get project list.' });
  }
}

async function createNode(projectId, nodeTitle, sendResponse) {
  const user = await LOCAL.getUser();
  const api = await LOCAL.getApi();
  if (!user) {
    console.error('User not set. Cannot create node.');
    sendResponse({ status: 'error', message: 'User not set. Cannot create node.' });
    return;
  }
  if (!api) {
    console.error('API not set. Cannot create node.');
    sendResponse({ status: 'error', message: 'API not set. Cannot create node.' });
    return;
  }
  const payload = { user, projectId, nodeTitle };
  try {
    const response = await fetch(`${api}/api/uploads/create_node`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if(response.ok) {
      const nodeData = await response.json();
      sendResponse({ status: 'success', node: nodeData });
    }
    else {
      const errorData = await response.json();
      sendResponse({ status: 'error', message: errorData.message });
    }
  } catch (error) {
    console.error('Error creating node:', error);
    sendResponse({ status: 'error', message: 'Failed to create node.' });
  }
}


export { saveURL, getProject, getProjectList, getProjectstructure, createNode };
