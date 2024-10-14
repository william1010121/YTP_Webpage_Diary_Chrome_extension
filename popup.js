// popup.js

document.addEventListener('DOMContentLoaded', () => {
  const saveUrlButton = document.getElementById('save-url');
  const markTreasureButton = document.getElementById('mark-treasure');
  const toggleAutoButton = document.getElementById('toggle-auto');
  const userInput = document.getElementById('user');
  const statusDiv = document.getElementById('status');

  // Load saved user from storage if exists
  chrome.storage.local.get(['user'], (result) => {
    if (result.user) {
      userInput.value = result.user;
    }
  });

  // Save User Input to storage on change
  userInput.addEventListener('change', () => {
    const user = userInput.value.trim();
    if (user) {
      chrome.storage.local.set({ user }, () => {
        console.log('User saved:', user);
      });
    }
  });

  // Handle Save URL Button Click
  saveUrlButton.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const user = userInput.value.trim();
    if (!user) {
      showStatus('Please enter a user.', true);
      return;
    }
    const url = tab.url;

    const payload = { user, url };

    try {
      const response = await fetch('http://127.0.0.1:8000/api/uploads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        showStatus('URL saved successfully.');
      } else {
        const errorData = await response.json();
        showStatus(`Error: ${errorData.detail || response.statusText}`, true);
      }
    } catch (error) {
      console.error('Error saving URL:', error);
      showStatus('Failed to save URL.', true);
    }
  });

  // Handle Mark as Treasure Website Button Click
  markTreasureButton.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = new URL(tab.url);
    const origin = url.origin;

    chrome.storage.local.get(['treasureWebsites'], (result) => {
      let treasureWebsites = result.treasureWebsites || [];
      if (!treasureWebsites.includes(origin)) {
        treasureWebsites.push(origin);
        chrome.storage.local.set({ treasureWebsites }, () => {
          showStatus('Marked as Treasure Website.');
        });
      } else {
        showStatus('This website is already a Treasure Website.', true);
      }
    });
  });

   // Handle Toggle Auto Upload Button Click
   toggleAutoButton.addEventListener('click', () => {
     chrome.storage.local.get(['autoUpload'], (result) => {
       const currentState = result.autoUpload || false;
       const newState = !currentState;
       chrome.storage.local.set({ autoUpload: newState }, () => {
         updateToggleButton(newState);
         const message = newState ? 'Auto Upload Enabled.' : 'Auto Upload Disabled.';
         showStatus(message);
       });
     });
   });

  // Function to display status messages
  function showStatus(message, isError = false) {
    statusDiv.textContent = message;
    statusDiv.style.color = isError ? 'red' : 'green';
    setTimeout(() => {
      statusDiv.textContent = '';
    }, 3000);
  }
  // Function to update the toggle button label based on state
  function updateToggleButton(isEnabled) {
    toggleAutoButton.textContent = isEnabled ? 'Disable Auto Upload' : 'Enable Auto Upload';
  }
});

