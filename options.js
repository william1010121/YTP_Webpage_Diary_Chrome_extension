document.addEventListener('DOMContentLoaded', () => {
  // --- Element Selectors ---
  const userInput = document.getElementById('user');
  const apiInput = document.getElementById('api');
  const llmApiKey = document.getElementById('api-key');
  const llmApiURL = document.getElementById('api-url');
  const statusDiv = document.getElementById('options-status'); // Status for options page

  // --- Reusable Storage Functions (Copy from popup.js if you haven't already) ---
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
        console.log(`${key} saved in options:`, value);
        showStatus(`Setting '${key}' saved.`); // Show status on options page
        resolve();
      });
    });
  };

  const showStatus = (message, isError = false) => {
    statusDiv.textContent = message;
    statusDiv.style.color = isError ? 'red' : 'green';
    setTimeout(() => {
      statusDiv.textContent = '';
    }, 3000);
  };


  // --- Load Settings when Options Page Loads ---
  const loadOptions = async () => {
    userInput.value = await loadSetting('user', '');
    apiInput.value = await loadSetting('api', "http://127.0.0.1:8000");
    llmApiKey.value = await loadSetting('llmApiKey', 'AIzaSyBqjdfVKLWdoG8eCuODdRz1__X4Bq3hPx8');
    llmApiURL.value = await loadSetting('llmApiURL', "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent");
      console.log("llmApiURL", llmApiURL.value);
  };
  loadOptions();

  // --- Event Listeners to Save Settings on Change ---
  userInput.addEventListener('change', () => {
    saveSetting('user', userInput.value.trim());
  });

  apiInput.addEventListener('change', () => {
    saveSetting('api', apiInput.value.trim());
  });

  llmApiKey.addEventListener('change', () => {
    saveSetting('llmApiKey', llmApiKey.value.trim());
  });

  llmApiURL.addEventListener('change', () => {
    saveSetting('llmApiURL', llmApiURL.value.trim());
  });

});
