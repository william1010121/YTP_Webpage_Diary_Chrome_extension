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

  const nodeContainersWrapper = document.getElementById("node-containers-wrapper");
  let nodeContainerCount = 1;

  // Add click handler for append child node buttons
  nodeContainersWrapper.addEventListener("click", (e) => {
    if (e.target.classList.contains("append-child-node")) {
      const parentContainer = e.target.closest(".search-container");
      const parentNodeInput = parentContainer.querySelector(".search-input");
      
      if (!parentNodeInput.dataset.selectedValue) {
        showStatus("Please select a parent node first", true);
        return;
      }

      const newContainer = createNodeSearchContainer(nodeContainerCount++);
      const parentLevel = parseInt(parentContainer.getAttribute("data-level") || "0");
      const childLevel = parentLevel + 1;
      newContainer.setAttribute("data-level", childLevel);

      // Change from paddingLeft to marginLeft
      newContainer.style.marginLeft = `${childLevel * 20}px`;
      
      // 移除個別元素的 padding-left 設定
      const headerContent = newContainer.querySelector(".header-content");
      if (headerContent) {
        headerContent.style.paddingLeft = "0";
      }

      parentContainer.insertAdjacentElement("afterend", newContainer);

      // Setup parent-child relationship
      newContainer.dataset.parentNodeId = parentNodeInput.dataset.selectedValue;
    }
    if (e.target.classList.contains("remove-node-container")) {
      const container = e.target.closest(".node-container");
      if (container) {
        container.remove();
      }
    }
    if (e.target.classList.contains("select-node")) {
      // 取消所有容器的選取狀態
      nodeContainersWrapper.querySelectorAll(".search-container").forEach(cont => cont.classList.remove("selected-node"));
      const container = e.target.closest(".search-container");
      container.classList.add("selected-node");
    }
  });

  function createNodeSearchContainer(index) {
    const container = document.createElement("div");
    container.className = "search-container node-container";
    container.id = `node-search-container-${index}`;
    
    container.innerHTML = `
      <div class="node-container-header">
        <div class="header-content">
          <input type="text" class="search-input" placeholder="Search or Create Child Node">
          <button class="select-node">Select Node</button>
          <button class="remove-node-container">×</button>
        </div>
        <div class="search-results"><ul></ul></div>
        <button class="append-child-node">+ Add Child Node</button>
      </div>
    `;

    // Setup input handlers for the new container
    const input = container.querySelector(".search-input");
    const resultsDiv = container.querySelector(".search-results");

    input.addEventListener("input", () => handleNodeSearch(input, resultsDiv));
    input.addEventListener("focus", () => handleNodeFocus(input, resultsDiv));
    input.addEventListener("blur", () => {
      setTimeout(() => {
        resultsDiv.style.display = "none";
      }, 100);
    });
    input.addEventListener("keydown", (event) => handleNodeKeydown(event, input));

    return container;
  }

  async function handleNodeSearch(input, resultsDiv) {
    const searchTerm = input.value.trim();
    const projectId = projectInput.value;
    const parentContainer = input.closest(".node-container");
    const parentNodeId = parentContainer ? parentContainer.dataset.parentNodeId : null;

    if (!projectId) {
      showStatus("Please select a project first to search nodes.", true);
      resultsDiv.style.display = "none";
      return;
    }

    sendMessageToBackground({ project: projectId, type: "get_project_structure" }, (response) => {
      if (!response || response.status !== "success") {
        showStatus(response ? `Error: ${response.message}` : "Error: Failed to get nodes.", true);
        return;
      }

      projectStructureCache = response.projectStructure;
      const structure = response.projectStructure.structure;
      const keyList = Object.keys(structure).filter(key => key !== "nodeTitle");

      let filteredNodes = [];
      if (searchTerm) {
        // If there's a parent node, only show its children
        if (parentNodeId && structure[parentNodeId]) {
          const childNodes = structure[parentNodeId];
          filteredNodes = childNodes.filter(nodeId => 
            structure.nodeTitle[nodeId].toLowerCase().includes(searchTerm.toLowerCase()) ||
            nodeId.toLowerCase().includes(searchTerm.toLowerCase())
          );
        } else {
          filteredNodes = keyList.filter(nodeId =>
            structure.nodeTitle[nodeId].toLowerCase().includes(searchTerm.toLowerCase()) ||
            nodeId.toLowerCase().includes(searchTerm.toLowerCase())
          );
        }
      } else if (parentNodeId && structure[parentNodeId]) {
        filteredNodes = structure[parentNodeId];
      } else {
        filteredNodes = keyList;
      }

      displaySearchResults(input, resultsDiv, filteredNodes, false);
    });
  }

  async function handleNodeFocus(input, resultsDiv) {
    const projectId = projectInput.value;
    const parentContainer = input.closest(".node-container");
    const parentNodeId = parentContainer ? parentContainer.dataset.parentNodeId : null;

    if (!projectId) {
      showStatus("Please select a project first to show nodes.", true);
      resultsDiv.style.display = "none";
      return;
    }

    if (input.value.trim() === "") {
      sendMessageToBackground({ project: projectId, type: "get_project_structure" }, (response) => {
        if (!response || response.status !== "success") {
          showStatus(response ? `Error: ${response.message}` : "Error: Failed to get nodes.", true);
          return;
        }

        projectStructureCache = response.projectStructure;
        const structure = response.projectStructure.structure;
        let nodeList;

        if (parentNodeId && structure[parentNodeId]) {
          nodeList = structure[parentNodeId];
        } else {
          nodeList = Object.keys(structure).filter(key => key !== "nodeTitle");
        }

        displaySearchResults(input, resultsDiv, nodeList, false);
      });
    }
  }

  async function handleNodeKeydown(event, input) {
    if (event.key === "Enter") {
      event.preventDefault();
      const nodeTitle = input.value.trim();
      const projectId = projectInput.value;
      const parentContainer = input.closest(".node-container");
      const parentNodeId = parentContainer ? parentContainer.dataset.parentNodeId : null;

      // If this is a child node input, check if the node already exists under its father.
      if (parentNodeId) {
        const structure = projectStructureCache.structure || {};
        const parentChildren = structure[parentNodeId] || [];
        const existingChild = parentChildren.find(childId => 
          structure.nodeTitle[childId].toLowerCase() === nodeTitle.toLowerCase()
        );
        if (existingChild) {
          // Select the existing node and notify the user.
          input.value = structure.nodeTitle[existingChild];
          input.dataset.selectedValue = existingChild;
          showStatus("Node already exists under parent. Selected existing node.");
          input.blur();
          return;
        }
      }

      // Replace querySelectorAll from input.closest(".search-results")
      const container = input.closest(".search-container");
      const resultsDiv = container ? container.querySelector(".search-results") : null;
      if (nodeTitle && resultsDiv && resultsDiv.querySelectorAll("li:not(.create-new)").length === 0) {
        if (!projectId) {
          showStatus("Please select a project first to create a node.", true);
          return;
        }

        // Create the new node
        sendMessageToBackground({ projectId, nodeTitle, type: "create_node" }, (response) => {
          if (!response || response.status !== "success") {
            showStatus(response ? `Error: ${response.message}` : "Error: Failed to create node.", true);
            return;
          }

          const newNodeId = response.node.ID;
          input.value = nodeTitle;
          input.dataset.selectedValue = newNodeId;

          // If there's a parent node, create an edge between the father and the new node.
          if (parentNodeId) {
            sendMessageToBackground({
              projectId,
              fromNodeId: parentNodeId,
              toNodeId: newNodeId,
              type: "create_edge"
            }, (edgeResponse) => {
              if (!edgeResponse || edgeResponse.status !== "success") {
                showStatus("Node created but failed to create edge.", true);
                return;
              }
              showStatus("Node created and connected successfully.");
            });
          } else {
            showStatus("Node created successfully.");
          }
        });
      }
      input.blur();
    }
  }

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

    const projectId = projectInput.dataset.selectedValue;
    if (!projectId) {
      showStatus("Please select a project.", true);
      return;
    }

    const nodeId = getLowestNodeId();
    if (!nodeId) {
      showStatus("Please select at least one node.", true);
      return;
    }

    const urlType = selectUrlType.value;
    if (!urlType) {
      showStatus("Please select a URL type.", true);
      return;
    }

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

    const projectId = projectInput.dataset.selectedValue;
    if (!projectId) {
      showStatus("Please select a project.", true);
      return;
    }

    const nodeId = getLowestNodeId();
    if (!nodeId) {
      showStatus("Please select at least one node.", true);
      return;
    }

    const urlType = selectUrlType.value;
    if (!urlType) {
      showStatus("Please select a URL type.", true);
      return;
    }

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = tab.url;

    setButtonLoadingState(summaryAndSaveURLButton, true, "Summarizing and Saving...");
    await summaryCurrentPage();
    setButtonLoadingState(summaryAndSaveURLButton, false, "Summarize & Save URL", "Summarize & Save URL");

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

  const getLowestNodeId = () => {
    const selectedContainer = nodeContainersWrapper.querySelector(".search-container.selected-node");
    if (selectedContainer) {
      const input = selectedContainer.querySelector(".search-input");
      if (input.dataset.selectedValue) return input.dataset.selectedValue;
    }
    // 原本邏輯：回傳第一個葉節點的 nodeId
    const containers = nodeContainersWrapper.querySelectorAll(".search-container");
    let leafNodes = [];
    
    containers.forEach(container => {
      // Check if this container has any child node containers
      const nextSibling = container.nextElementSibling;
      const hasChildNodes = nextSibling && nextSibling.classList.contains('node-container');
      
      if (!hasChildNodes) {
        // This is a leaf node, get its node ID
        const input = container.querySelector(".search-input");
        const nodeId = input.dataset.selectedValue;
        if (nodeId) {
          leafNodes.push(nodeId);
        }
      }
    });
    
    // Return the first leaf node ID found (or null if none found)
    return leafNodes.length > 0 ? leafNodes[0] : null;
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
