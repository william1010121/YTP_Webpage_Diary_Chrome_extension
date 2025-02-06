document.addEventListener('DOMContentLoaded', () => {
  // --- Element Selectors ---
  const saveUrlButton = document.getElementById('save-url');
  const summaryAndSaveURLButton = document.getElementById('summary-and-save-url');
  const markTreasureButton = document.getElementById('mark-treasure');
  const toggleAutoButton = document.getElementById('toggle-auto');
  const summaryButton = document.getElementById('summary');
  const statusDiv = document.getElementById('status');
  const treasureList = document.getElementById('treasure-list');

  const inputText = document.getElementById('input-text');
  const titleText = document.getElementById('title-text');
  const outputText = document.getElementById('output-text');
  const submitButton = document.getElementById('SubmitInput');

  const selectProject = document.getElementById('projectId');
  const selectNodeId = document.getElementById('nodeId');
  const selectUrlType = document.getElementById('urlType');

  const createProjectButton = document.getElementById('create-project');
  const createNodeButton = document.getElementById('create-node');

  const dialogInfo = document.getElementById('dialog-info');
  const openOptionsButton = document.getElementById('open-options'); // Get the new button



  // --- Reusable Storage Functions ---
  const loadSetting = (key, defaultValue) => {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => {
        resolve(result[key] === undefined ? defaultValue : result[key]);
      });
    });
  };

  const saveSetting = (key, value) => {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, () => {
        console.log(`${key} saved:`, value);
        resolve();
      });
    });
  };

  // --- UI Update Functions ---
  const updateTreasureListUI = (treasureWebsites) => {
    treasureList.value = treasureWebsites.join('\n');
  };

  const showStatus = (message, isError = false) => {
    statusDiv.textContent = message;
    statusDiv.style.color = isError ? 'red' : 'green';
    dialogInfo.textContent = message;
    dialogInfo.style.color = isError ? 'red' : 'green';
    showDialog();
    setTimeout(() => {
      statusDiv.textContent = '';
    }, 3000);
  };

  const updateToggleButtonUI = (isEnabled) => {
    toggleAutoButton.textContent = isEnabled ? 'Disable Auto Upload' : 'Enable Auto Upload';
  };

  const setButtonLoadingState = (button, isLoading, loadingText = 'Loading...', originalText = null) => {
    button.disabled = isLoading;
    if (isLoading) {
      button.dataset.originalText = originalText || button.textContent; // Store original text if not already stored
      button.textContent = loadingText;
    } else {
      button.textContent = button.dataset.originalText || originalText || button.textContent; // Restore original or provided text
      delete button.dataset.originalText; // Clean up stored original text
    }
  };


  const populateDropdown = (dropdown, options, valueKey = 'value', textKey = 'text') => {
    dropdown.innerHTML = '';
    options.forEach(optionData => {
      const option = document.createElement('option');
      option.value = optionData[valueKey];
      option.text = optionData[textKey];
      dropdown.appendChild(option);
    });
  };


  // --- API Interaction Functions ---
  const callGeminiAPI = (text, responseHandler) => {
    loadSetting('llmApiURL', "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent").then(llmApiURL => {
      loadSetting('llmApiKey', 'AIzaSyBqjdfVKLWdoG8eCuODdRz1__X4Bq3hPx8').then(llmApiKey => {
        const api = llmApiURL.trim();
        const key = llmApiKey.trim();
        const type = 'gemini';
        chrome.runtime.sendMessage({ text, type, apiKey: key, apiUrl: api }, responseHandler);
      });
    });
  };

  const sendMessageToBackground = (message, responseHandler) => {
    chrome.runtime.sendMessage(message, responseHandler);
  };


  // --- Data Initialization on Popup Load ---
  const initializePopup = async () => {
    const initialTreasureWebsites = await loadSetting('treasureWebsites', []);
    updateTreasureListUI(initialTreasureWebsites);
    const initialAutoUpload = await loadSetting('autoUpload', false);
    updateToggleButtonUI(initialAutoUpload);
  };

  initializePopup();

  // --- Event Listeners ---
  openOptionsButton.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // Treasure Website List - Save on Change
  treasureList.addEventListener('change', () => {
    const treasureWebsites = treasureList.value.trim().split('\n');
    saveSetting('treasureWebsites', treasureWebsites);
  });


  // Submit Input Button Click
  submitButton.addEventListener('click', async () => {
    setButtonLoadingState(submitButton, true);
    outputText.textContent = 'Loading...';
    titleText.textContent = 'Loading...';
    const text = inputText.value.trim();
    callGeminiAPI(text, (response) => {
      setButtonLoadingState(submitButton, false);
      if (response.status == "success") {
        outputText.textContent = response.response;
        titleText.textContent = response.title;
      } else {
        outputText.textContent = 'Error: Failed to get response.';
        titleText.textContent = 'Error: Failed to get title.';
      }
    });
  });

  // --- Reusable Validation Functions ---
  const validateUser = async () => {
    const user = await loadSetting('user', '');
    if (!user) {
      showStatus('Please enter a user in Options page.', true);
      return false;
    }
    return user;
  };

  const validateProjectNodeUrlType = () => {
    const projectId = selectProject.value;
    const nodeId = selectNodeId.value;
    const urlType = selectUrlType.value;
    if (!projectId || !nodeId || !urlType) {
      showStatus('Please select a project, node, and URL type.', true);
      return false;
    }
    return { projectId, nodeId, urlType };
  };


  // --- Button Click Handlers ---

  // Save URL Button Click
  saveUrlButton.addEventListener('click', async () => {
    const user = await validateUser();
    if (!user) return;

    const projectNodeUrlTypeData = validateProjectNodeUrlType();
    if (!projectNodeUrlTypeData) return;
    const { projectId, nodeId, urlType } = projectNodeUrlTypeData;

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = tab.url;
    loadSetting('api', "http://127.0.0.1:8000").then(apiURL => {
      sendMessageToBackground({ url, projectId, nodeId, urlType, type: 'save_url', apiUrl: apiURL }, (response) => {
        if (!response) {
          showStatus('Error: Failed to save URL.', true);
          return;
        }
        if (response.status === 'success') {
          showStatus('URL saved successfully.');
        } else {
          showStatus(`Error: ${response.message}`, true);
        }
      });
    });
  });


  // Summary and Save URL Button Click
  summaryAndSaveURLButton.addEventListener('click', async () => {
    const user = await validateUser();
    if (!user) return;
    const projectNodeUrlTypeData = validateProjectNodeUrlType();
    if (!projectNodeUrlTypeData) return;
    const { projectId, nodeId, urlType } = projectNodeUrlTypeData;

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = tab.url;

    setButtonLoadingState(summaryAndSaveURLButton, true, 'Summarizing and Saving...');
    await summaryCurrentPage(); // Ensure summary is complete before proceeding
    setButtonLoadingState(summaryAndSaveURLButton, false, 'Summarize & Save URL', 'Summarize & Save URL'); // Restore text

    const content = outputText.textContent;
    const title = titleText.textContent;
    loadSetting('api', "http://127.0.0.1:8000").then(apiURL => {
      sendMessageToBackground({ url, content, title, projectId, urlType, nodeId, type: 'save_url_content_title', apiUrl: apiURL }, (response) => {
        if (!response) {
          showStatus('Error: Failed to save URL and Content.', true);
          return;
        }
        if (response.status === 'success') {
          showStatus('URL saved successfully.');
        } else {
          showStatus(`Error: ${response.message}`, true);
        }
      });
    });
  });


  // Mark as Treasure Website Button Click
  markTreasureButton.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = new URL(tab.url);
    const origin = url.origin;

    const treasureWebsites = await loadSetting('treasureWebsites', []);
    if (!treasureWebsites.includes(origin)) {
      treasureWebsites.push(origin);
      await saveSetting('treasureWebsites', treasureWebsites);
      updateTreasureListUI(treasureWebsites);
      showStatus('Marked as Treasure Website.');
    } else {
      showStatus('This website is already a Treasure Website.', true);
    }
  });


  // Toggle Auto Upload Button Click
  toggleAutoButton.addEventListener('click', async () => {
    const currentState = await loadSetting('autoUpload', false);
    const newState = !currentState;
    await saveSetting('autoUpload', newState);
    updateToggleButtonUI(newState);
    const message = newState ? 'Auto Upload Enabled.' : 'Auto Upload Disabled.';
    showStatus(message);
  });


  // Summary Button Click
  summaryButton.addEventListener('click', async () => {
    await summaryCurrentPage();
  });


  // --- Helper Functions ---

  async function summaryCurrentPage() {
    setButtonLoadingState(summaryButton, true);
    outputText.textContent = 'Loading...';
    titleText.textContent = 'Loading...';
    return new Promise((resolve, reject) => {
      sendMessageToBackground({ type: 'summary' }, (response) => {
        setButtonLoadingState(summaryButton, false);
        if (response && response.status === 'success') {
          outputText.textContent = response.response;
          titleText.textContent = response.title;
          resolve(response);
        } else {
          outputText.textContent = 'Error: Failed to get response.';
          titleText.textContent = 'Error: Failed to get title.';
          reject('Failed to get response.');
        }
      });
    });
  };


  // --- Dropdown Population and Project/Node Creation ---

  selectProject.addEventListener('click', () => {
    sendMessageToBackground({ type: 'get_projects' }, (response) => {
      if (!response || response.status !== 'success') {
        showStatus(response ? `Error: ${response.message}` : 'Error: Failed to get projects.', true);
        return;
      }
      const length = response.projectList['project-length'];
      const projects = response.projectList.projects;
      const projectOptions = [];
      for (let i = 0; i < length; i++) {
        projectOptions.push({ value: projects[i], text: projects[i] });
      }
      populateDropdown(selectProject, projectOptions);
    });
  });


  selectNodeId.addEventListener('click', () => {
    const project = selectProject.value;
    if (!project) {
      showStatus('Please select a project.', true);
      return;
    }
    sendMessageToBackground({ project, type: 'get_project_structure' }, (response) => {
      if (!response || response.status !== 'success') {
        showStatus(response ? `Error: ${response.message}` : 'Error: Failed to get nodes.', true);
        return;
      }

      const structure = response.projectStructure.structure;
      const keyList = Object.keys(structure).filter(key => key !== "nodeTitle");
      const nodeOptions = [];
      for (let i = 0; i < keyList.length; i++) {
        nodeOptions.push({ value: keyList[i], text: `${structure["nodeTitle"][keyList[i]]}(${keyList[i]})` });
      }
      populateDropdown(selectNodeId, nodeOptions);
    });
  });


  // Project Creation
  createProjectButton.addEventListener('click', async () => {
    const projectName = await selfPrompt("Please enter the project name:");
    if (projectName) {
      sendMessageToBackground({ project: projectName, type: 'get_project_structure' }, (response) => {
        if (!response || response.status !== 'success') {
          showStatus(response ? `Error: ${response.message}` : 'Error: Failed to create project.', true);
          return;
        }
        showStatus('Project created successfully.');
      });
    }
  });


  // Node Creation
  createNodeButton.addEventListener('click', async () => {
    const projectId = selectProject.value;
    if (!projectId) {
      showStatus('Please select a project.', true);
      return;
    }
    const nodeTitle = await selfPrompt("Please enter the node title:");
    if (nodeTitle) {
      sendMessageToBackground({ projectId, nodeTitle, type: 'create_node' }, (response) => {
        if (!response || response.status !== 'success') {
          showStatus(response ? `Error: ${response.message}` : 'Error: Failed to create node.', true);
          return;
        }
        showStatus('Node created successfully.');
      });
    }
  });


  // --- Dialog Functions and Event Listeners ---
  function showDialog() {
    const dialog = document.getElementById('dialog');
    dialog.showModal();
  }

  function closeDialog() {
    const dialog = document.getElementById('dialog');
    dialog.close();
  }

  document.addEventListener('DOMContentLoaded', () => { // Redundant listener - already in DOMContentLoaded
    const closeDialogButton = document.getElementById('close-dialog');
    const openDialogButton = document.getElementById('open-dialog'); // openDialogButton is defined but not used. Consider removing if unused.
    closeDialogButton.addEventListener('click', () => {
      closeDialog();
    });
  });


  async function selfPrompt(Info) {
    const promptDialog = document.getElementById('prompt'); // Renamed for clarity
    const promptInfo = document.getElementById('prompt-info');
    const submitPromptButton = document.getElementById('prompt-submit'); // Renamed for clarity
    const promptInput = document.getElementById('prompt-input'); // Renamed for clarity

    promptInfo.textContent = Info;
    promptDialog.showModal();

    return new Promise((resolve) => {
      const submitHandler = () => {
        const value = promptInput.value;
        promptDialog.close();
        submitPromptButton.removeEventListener('click', submitHandler); // Remove listener after one use
        resolve(value);
      };
      submitPromptButton.addEventListener('click', submitHandler);
    });
  }

});
