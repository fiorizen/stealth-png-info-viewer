import { parsePngInfo, parseStableDiffusionParameters } from './png-parser.js';

const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const resultArea = document.getElementById('result-area');
const previewImage = document.getElementById('preview-image');
const promptDisplay = document.getElementById('prompt-display');
const negativePromptDisplay = document.getElementById('negative-prompt-display');
const otherParamsDisplay = document.getElementById('other-params-display');
const rawDataDisplay = document.getElementById('raw-data-display');

// Drag & Drop Events
dropzone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropzone.classList.add('dragover');
});

dropzone.addEventListener('dragleave', () => {
  dropzone.classList.remove('dragover');
});

dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropzone.classList.remove('dragover');
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    handleFile(files[0]);
  }
});

// Click to upload
dropzone.addEventListener('click', () => {
  fileInput.click();
});

fileInput.addEventListener('change', (e) => {
  if (e.target.files.length > 0) {
    handleFile(e.target.files[0]);
  }
});

async function handleFile(file) {
  if (file.type !== 'image/png') {
    alert('Please upload a PNG file.');
    return;
  }

  // Show preview
  const objectUrl = URL.createObjectURL(file);
  previewImage.src = objectUrl;
  previewImage.onload = () => URL.revokeObjectURL(objectUrl);

  // Parse Metadata
  try {
    const metadata = await parsePngInfo(file);
    displayMetadata(metadata);
    resultArea.style.display = 'grid'; // Show results
    
    // Scroll to results
    resultArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) {
    console.error(error);
    alert('Error parsing PNG file: ' + error.message);
  }
}

function displayMetadata(metadata) {
  // Clear previous data
  promptDisplay.innerHTML = '<span class="placeholder">No data</span>';
  negativePromptDisplay.innerHTML = '<span class="placeholder">No data</span>';
  otherParamsDisplay.innerHTML = '<span class="placeholder">No data</span>';
  rawDataDisplay.textContent = JSON.stringify(metadata, null, 2);

  // Look for "parameters" (Stable Diffusion)
  if (metadata.parameters) {
    const sdParams = parseStableDiffusionParameters(metadata.parameters);
    
    if (sdParams) {
      if (sdParams.prompt) updateDisplay(promptDisplay, sdParams.prompt);
      if (sdParams.negativePrompt) updateDisplay(negativePromptDisplay, sdParams.negativePrompt);
      
      if (Object.keys(sdParams.params).length > 0) {
        const paramsText = Object.entries(sdParams.params)
          .map(([k, v]) => `<strong>${k}:</strong> ${v}`)
          .join('<br>');
        updateDisplay(otherParamsDisplay, paramsText, true);
      }
    }
  } else {
    // Try to find other common keys if "parameters" is missing
    // e.g. "Description", "Comment", "Software"
    // For now, just show raw data if no specific SD params found
    if (Object.keys(metadata).length === 0) {
      rawDataDisplay.textContent = "No text chunks found in this PNG.";
    }
  }
}

function updateDisplay(element, text, isHtml = false) {
  element.innerHTML = ''; // Clear placeholder
  
  const content = document.createElement('div');
  if (isHtml) {
    content.innerHTML = text;
  } else {
    content.textContent = text;
  }
  element.appendChild(content);

  // Add copy button
  if (!isHtml) {
    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-btn';
    copyBtn.textContent = 'Copy';
    copyBtn.onclick = () => {
      navigator.clipboard.writeText(text);
      copyBtn.textContent = 'Copied!';
      setTimeout(() => copyBtn.textContent = 'Copy', 2000);
    };
    element.appendChild(copyBtn);
  }
}
