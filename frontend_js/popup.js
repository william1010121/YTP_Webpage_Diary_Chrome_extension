//popup.js

document.addEventListener("DOMContentLoaded", () => {
  // --- Element Selectors ---
  const saveUrlButton = document.getElementById("save-url");
  const summaryAndSaveURLButton = document.getElementById("summary-and-save-url");
  const markTreasureButton = document.getElementById("mark-treasure");
  const toggleAutoButton = document.getElementById("toggle-auto");
  const summaryButton = document.getElementById("summary");
  const statusDiv = document.getElementById("status");
  const treasureList = document.getElementById("treasure-list");

  const inputText = document.getElementById("input-text");
  const titleText = document.getElementById("title-text");
  const outputText = document.getElementById("output-text");
  const submitButton = document.getElementById("SubmitInput");

  const projectInput = document.getElementById("projectId"); // Input instead of select
  const nodeInput = document.getElementById("nodeId"); // Input instead of select
  const selectUrlType = document.getElementById("urlType");

  const projectResultsDiv = document.getElementById("projectId-results"); // Results div
  const nodeResultsDiv = document.getElementById("nodeId-results"); // Results div

  const dialogInfo = document.getElementById("dialog-info");
  const openOptionsButton = document.getElementById("open-options"); // Get the new button

  const nodeSearchContainer = document.getElementById("node-search-container");

  let projectListCache = []; // Cache project list
  let projectStructureCache = {}; // Cache project structure

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
    treasureList.value = treasureWebsites.join("\n");
  };

  const showStatus = (message, isError = false) => {
    statusDiv.textContent = message;
    statusDiv.style.color = isError ? "red" : "green";
    dialogInfo.textContent = message;
    dialogInfo.style.color = isError ? "red" : "green";
    showDialog();
    setTimeout(() => {
      statusDiv.textContent = "";
    }, 3000);
  };

  const updateToggleButtonUI = (isEnabled) => {
    toggleAutoButton.textContent = isEnabled ? "Disable Auto Upload" : "Enable Auto Upload";
  };

  const setButtonLoadingState = (button, isLoading, loadingText = "Loading...", originalText = null) => {
    button.disabled = isLoading;
    if (isLoading) {
      button.dataset.originalText = originalText || button.textContent; // Store original text if not already stored
      button.textContent = loadingText;
    } else {
      button.textContent = button.dataset.originalText || originalText || button.textContent; // Restore original or provided text
      delete button.dataset.originalText; // Clean up stored original text
    }
  };

  const displaySearchResults = (inputElement, resultsDiv, results, isProject = true) => {
    const ul = resultsDiv.querySelector("ul");
    ul.innerHTML = ""; // Clear previous results

    if (results && results.length > 0) {
      results.forEach((item) => {
        const li = document.createElement("li");
        li.textContent = isProject ? item : `${projectStructureCache.structure["nodeTitle"][item]}(${item})`; // Display node title if available
        li.addEventListener("click", () => {
          inputElement.value = isProject ? item : projectStructureCache.structure["nodeTitle"][item]; // Set input value on click
          resultsDiv.style.display = "none"; // Hide results
          if (isProject && projectInput.value.trim() !== "") {
            nodeSearchContainer.style.display = "block";
          }
          // Store the selected value somewhere if needed, or just get from input on save
          inputElement.dataset.selectedValue = item; // Store actual id for node or project name for project
        });
        ul.appendChild(li);
      });
    } else if (inputElement.value.trim() !== "") {
      // Option to create new if no results and input is not empty
      const li = document.createElement("li");
      li.textContent = `Create New ${isProject ? "Project" : "Node"} "${inputElement.value.trim()}"`;
      li.classList.add("create-new"); // Style differently
      li.addEventListener("click", async () => {
        resultsDiv.style.display = "none"; // Hide results
        if (isProject) {
          await createProject(inputElement.value.trim()); // Call create project function
        } else {
          const projectId = projectInput.value; // Get selected project to create node under
          if (!projectId) {
            showStatus("Please select a project first to create a node.", true);
            return;
          }
          await createNode(projectId, inputElement.value.trim()); // Call create node function
        }
      });
      ul.appendChild(li);
    }

    resultsDiv.style.display = (results && results.length > 0) || inputElement.value.trim() !== "" ? "block" : "none"; // Show if results or input
  };

  // --- API Interaction Functions ---
  const callGeminiAPI = (text, responseHandler) => {
    loadSetting("llmApiURL", "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent").then((llmApiURL) => {
      loadSetting("llmApiKey", "AIzaSyBqjdfVKLWdoG8eCuODdRz1__X4Bq3hPx8").then((llmApiKey) => {
        const api = llmApiURL.trim();
        const key = llmApiKey.trim();
        const type = "gemini";
        chrome.runtime.sendMessage({ text, type, apiKey: key, apiUrl: api }, responseHandler);
      });
    });
  };

  const sendMessageToBackground = (message, responseHandler) => {
    chrome.runtime.sendMessage(message, responseHandler);
  };

  // --- Data Initialization on Popup Load ---
  const initializePopup = async () => {
    const initialTreasureWebsites = await loadSetting("treasureWebsites", []);
    updateTreasureListUI(initialTreasureWebsites);
    const initialAutoUpload = await loadSetting("autoUpload", false);
    updateToggleButtonUI(initialAutoUpload);
    nodeSearchContainer.style.display = "none";
    loadProjects(); // Load projects on popup open
  };

  const loadProjects = () => {
    sendMessageToBackground({ type: "get_projects" }, (response) => {
      if (!response || response.status !== "success") {
        showStatus(response ? `Error: ${response.message}` : "Error: Failed to get projects.", true);
        return;
      }
      projectListCache = response.projectList.projects; // Store project list in cache
    });
  };

  initializePopup();

  // --- Event Listeners ---
  openOptionsButton.addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });

  // Treasure Website List - Save on Change
  treasureList.addEventListener("change", () => {
    const treasureWebsites = treasureList.value.trim().split("\n");
    saveSetting("treasureWebsites", treasureWebsites);
  });

  // Submit Input Button Click
  submitButton.addEventListener("click", async () => {
    setButtonLoadingState(submitButton, true);
    outputText.textContent = "Loading...";
    titleText.textContent = "Loading...";
    const text = inputText.value.trim();
    callGeminiAPI(text, (response) => {
      setButtonLoadingState(submitButton, false);
      if (response.status == "success") {
        outputText.textContent = response.response;
        titleText.textContent = response.title;
      } else {
        outputText.textContent = "Error: Failed to get response.";
        titleText.textContent = "Error: Failed to get title.";
      }
    });
  });

  projectInput.addEventListener("input", () => {
    const searchTerm = projectInput.value.trim();
    if (searchTerm) {
      const filteredProjects = projectListCache.filter((project) => project.toLowerCase().includes(searchTerm.toLowerCase()));
      displaySearchResults(projectInput, projectResultsDiv, filteredProjects, true);
    } else {
      displaySearchResults(projectInput, projectResultsDiv, projectListCache, true); // Show all projects if input is cleared
    }
  });

  projectInput.addEventListener("focus", () => {
    if (projectInput.value.trim() === "") {
      displaySearchResults(projectInput, projectResultsDiv, projectListCache, true); // Show all projects when focused and empty
    } else {
      projectResultsDiv.style.display = "block"; // Ensure result is shown when focused if not empty
    }
  });

  projectInput.addEventListener("blur", () => {
    setTimeout(() => {
      // Delay hiding to allow click on result item
      projectResultsDiv.style.display = "none";
    }, 100); // Short delay
    if (projectInput.value.trim() !== "") nodeSearchContainer.style.display = "block";
  });

  // Project Input - Enter Key Handling
  projectInput.addEventListener("keydown", async (event) => {
    if (event.key === "Enter") {
      event.preventDefault(); // Prevent form submission or other default actions
      const projectName = projectInput.value.trim();
      if (projectName && projectResultsDiv.querySelectorAll("li:not(.create-new)").length === 0) {
        // If there's input text and no existing results (only 'create-new' option or no results at all)
        await createProject(projectName);
      }
      nodeInput.focus(); // Move focus to node input after project selection
      console.log("Project Enter Key Pressed");
    }
  });

  nodeInput.addEventListener("input", () => {
    const searchTerm = nodeInput.value.trim();
    const projectId = projectInput.value; // Get selected project to filter nodes

    if (!projectId) {
      showStatus("Please select a project first to search nodes.", true);
      nodeResultsDiv.style.display = "none"; // Hide node results if no project
      return;
    }

    sendMessageToBackground({ project: projectId, type: "get_project_structure" }, (response) => {
      if (!response || response.status !== "success") {
        showStatus(response ? `Error: ${response.message}` : "Error: Failed to get nodes.", true);
        return;
      }
      projectStructureCache = response.projectStructure; // Cache structure
      const structure = response.projectStructure.structure;
      const keyList = Object.keys(structure).filter((key) => key !== "nodeTitle");

      let filteredNodes = [];
      if (searchTerm) {
        filteredNodes = keyList.filter((nodeId) => structure["nodeTitle"][nodeId].toLowerCase().includes(searchTerm.toLowerCase()) || nodeId.toLowerCase().includes(searchTerm.toLowerCase()));
      } else {
        filteredNodes = keyList; // Show all nodes if input is cleared
      }
      displaySearchResults(nodeInput, nodeResultsDiv, filteredNodes, false);
    });
  });

  nodeInput.addEventListener("focus", () => {
    const projectId = projectInput.value; // Get selected project to show nodes
    if (!projectId) {
      showStatus("Please select a project first to show nodes.", true);
      nodeResultsDiv.style.display = "none";
      return;
    }
    if (nodeInput.value.trim() === "") {
      // Fetch and display all nodes when focused and input is empty
      sendMessageToBackground({ project: projectId, type: "get_project_structure" }, (response) => {
        if (!response || response.status !== "success") {
          showStatus(response ? `Error: ${response.message}` : "Error: Failed to get nodes.", true);
          return;
        }
        projectStructureCache = response.projectStructure; // Cache structure
        nodeInput.style.display = "block";
        const structure = response.projectStructure.structure;
        const keyList = Object.keys(structure).filter((key) => key !== "nodeTitle");
        displaySearchResults(nodeInput, nodeResultsDiv, keyList, false);
      });
    } else {
      nodeResultsDiv.style.display = "block"; // Ensure result is shown when focused if not empty
    }
  });

  nodeInput.addEventListener("blur", () => {
    setTimeout(() => {
      // Delay hiding to allow click on result item
      nodeResultsDiv.style.display = "none";
    }, 100); // Short delay
  });

  // Node Input - Enter Key Handling
  nodeInput.addEventListener("keydown", async (event) => {
    if (event.key === "Enter") {
      event.preventDefault(); // Prevent form submission
      const nodeTitle = nodeInput.value.trim();
      const projectId = projectInput.value;
      if (nodeTitle && nodeResultsDiv.querySelectorAll("li:not(.create-new)").length === 0) {
        // If there's input text and no existing results
        if (!projectId) {
          showStatus("Please select a project first to create a node.", true);
          return;
        }
        await createNode(projectId, nodeTitle);
      }
      nodeInput.blur(); // Remove focus after node selection
    }
  });

  // --- Reusable Validation Functions ---
  const validateUser = async () => {
    const user = await loadSetting("user", "");
    if (!user) {
      showStatus("Please enter a user in Options page.", true);
      return false;
    }
    return user;
  };

  const validateProjectNodeUrlType = () => {
    //Modified to get values from input
    const projectId = projectInput.dataset.selectedValue; // Use stored value or input value if no selection?
    const nodeId = nodeInput.dataset.selectedValue; // Use stored value
    const urlType = selectUrlType.value;
    if (!projectId || !nodeId || !urlType) {
      showStatus("Please select a project, node, and URL type.", true);
      return false;
    }
    return { projectId, nodeId, urlType };
  };

  // --- Button Click Handlers ---

  // Save URL Button Click
  saveUrlButton.addEventListener("click", async () => {
    const user = await validateUser();
    if (!user) return;

    const projectNodeUrlTypeData = validateProjectNodeUrlType();
    if (!projectNodeUrlTypeData) return;
    const { projectId, nodeId, urlType } = projectNodeUrlTypeData;

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = tab.url;
    loadSetting("api", "http://127.0.0.1:8000").then((apiURL) => {
      sendMessageToBackground({ url, projectId, nodeId, urlType, type: "save_url", apiUrl: apiURL }, (response) => {
        if (!response) {
          showStatus("Error: Failed to save URL.", true);
          return;
        }
        if (response.status === "success") {
          showStatus("URL saved successfully.");
        } else {
          showStatus(`Error: ${response.message}`, true);
        }
      });
    });
  });

  // Summary and Save URL Button Click
  summaryAndSaveURLButton.addEventListener("click", async () => {
    const user = await validateUser();
    if (!user) return;
    const projectNodeUrlTypeData = validateProjectNodeUrlType();
    if (!projectNodeUrlTypeData) return;
    const { projectId, nodeId, urlType } = projectNodeUrlTypeData;

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = tab.url;

    setButtonLoadingState(summaryAndSaveURLButton, true, "Summarizing and Saving...");
    await summaryCurrentPage(); // Ensure summary is complete before proceeding
    setButtonLoadingState(summaryAndSaveURLButton, false, "Summarize & Save URL", "Summarize & Save URL"); // Restore text

    const content = outputText.textContent;
    const title = titleText.textContent;
    loadSetting("api", "http://127.0.0.1:8000").then((apiURL) => {
      sendMessageToBackground({ url, content, title, projectId, urlType, nodeId, type: "save_url_content_title", apiUrl: apiURL }, (response) => {
        if (!response) {
          showStatus("Error: Failed to save URL and Content.", true);
          return;
        }
        if (response.status === "success") {
          showStatus("URL saved successfully.");
        } else {
          showStatus(`Error: ${response.message}`, true);
        }
      });
    });
  });

  // Mark as Treasure Website Button Click
  markTreasureButton.addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = new URL(tab.url);
    const origin = url.origin;

    const treasureWebsites = await loadSetting("treasureWebsites", []);
    if (!treasureWebsites.includes(origin)) {
      treasureWebsites.push(origin);
      await saveSetting("treasureWebsites", treasureWebsites);
      updateTreasureListUI(treasureWebsites);
      showStatus("Marked as Treasure Website.");
    } else {
      showStatus("This website is already a Treasure Website.", true);
    }
  });

  // Toggle Auto Upload Button Click
  toggleAutoButton.addEventListener("click", async () => {
    const currentState = await loadSetting("autoUpload", false);
    const newState = !currentState;
    await saveSetting("autoUpload", newState);
    updateToggleButtonUI(newState);
    const message = newState ? "Auto Upload Enabled." : "Auto Upload Disabled.";
    showStatus(message);
  });

  // Summary Button Click
  summaryButton.addEventListener("click", async () => {
    await summaryCurrentPage();
  });

  // --- Helper Functions ---

  async function summaryCurrentPage() {
    setButtonLoadingState(summaryButton, true);
    outputText.textContent = "Loading...";
    titleText.textContent = "Loading...";
    return new Promise((resolve, reject) => {
      sendMessageToBackground({ type: "summary" }, (response) => {
        setButtonLoadingState(summaryButton, false);
        if (response && response.status === "success") {
          outputText.textContent = response.response;
          titleText.textContent = response.title;
          resolve(response);
        } else {
          outputText.textContent = "Error: Failed to get response.";
          titleText.textContent = "Error: Failed to get title.";
          reject("Failed to get response.");
        }
      });
    });
  }

  // --- Dropdown Population and Project/Node Creation --- (Remove Dropdown population, modify creation)

  // Project Creation (Modified to use function and accept projectName directly)
  const createProject = async (projectName) => {
    if (projectName) {
      sendMessageToBackground({ project: projectName, type: "get_project_structure" }, (response) => {
        if (!response || response.status !== "success") {
          showStatus(response ? `Error: ${response.message}` : "Error: Failed to create project.", true);
          return;
        }
        showStatus("Project created successfully.");
        loadProjects(); // Reload projects after creating new one
        projectInput.value = projectName; // Set input to the new project name
        projectInput.dataset.selectedValue = projectName; // Store selected value
      });
    }
  };

  // Node Creation (Modified to use function and accept nodeTitle and projectId directly)
  const createNode = async (projectId, nodeTitle) => {
    if (nodeTitle) {
      sendMessageToBackground({ projectId, nodeTitle, type: "create_node" }, (response) => {
        if (!response || response.status !== "success") {
          showStatus(response ? `Error: ${response.message}` : "Error: Failed to create node.", true);
          return;
        }
        showStatus("Node created successfully.");
        // Ideally, refresh node list for the selected project, or just clear node input
        nodeInput.value = nodeTitle; // Set input to the new node title
        nodeInput.dataset.selectedValue = response.nodeId; // Assuming backend returns nodeId in response for newly created node, if not adjust accordingly, maybe fetch project structure again to refresh
      });
    }
  };

  // --- Dialog Functions and Event Listeners ---
  function showDialog() {
    const dialog = document.getElementById("dialog");
    dialog.showModal();
  }

  function closeDialog() {
    const dialog = document.getElementById("dialog");
    dialog.close();
  }

  const closeDialogButton = document.getElementById("close-dialog");
  const openDialogButton = document.getElementById("open-dialog"); // openDialogButton is defined but not used. Consider removing if unused.
  closeDialogButton.addEventListener("click", () => {
    closeDialog();
  });

  async function selfPrompt(Info) {
    const promptDialog = document.getElementById("prompt"); // Renamed for clarity
    const promptInfo = document.getElementById("prompt-info");
    const submitPromptButton = document.getElementById("prompt-submit"); // Renamed for clarity
    const promptInput = document.getElementById("prompt-input"); // Renamed for clarity

    promptInfo.textContent = Info;
    promptDialog.showModal();

    return new Promise((resolve) => {
      const submitHandler = () => {
        const value = promptInput.value;
        promptDialog.close();
        submitPromptButton.removeEventListener("click", submitHandler); // Remove listener after one use
        resolve(value);
      };
      submitPromptButton.addEventListener("click", submitHandler);
    });
  }
});
