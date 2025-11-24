import { parsePngInfo, parseStableDiffusionParameters } from './png-parser.js';

const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const resultsContainer = document.getElementById('results-container');

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
    handleFiles(files);
  }
});

// Click to upload
dropzone.addEventListener('click', () => {
  fileInput.click();
});

fileInput.addEventListener('change', (e) => {
  if (e.target.files.length > 0) {
    handleFiles(e.target.files);
  }
  // Reset input so same file can be selected again if needed
  fileInput.value = '';
});

async function handleFiles(files) {
  // Process files in reverse order so the first selected ends up at the top
  // (since we prepend to the container)
  const filesArray = Array.from(files);
  
  for (const file of filesArray) {
    if (file.type !== 'image/png') {
      console.warn(`Skipping non-PNG file: ${file.name}`);
      continue;
    }
    await processFile(file);
  }
}

async function processFile(file) {
  try {
    const metadata = await parsePngInfo(file);
    createResultCard(file, metadata);
  } catch (error) {
    console.error(`Error parsing ${file.name}:`, error);
    alert(`Error parsing ${file.name}: ` + error.message);
  }
}

function createResultCard(file, metadata) {
  const objectUrl = URL.createObjectURL(file);
  
  const card = document.createElement('div');
  card.className = 'glass-card result-card';
  
  // Image Column
  const imageContainer = document.createElement('div');
  imageContainer.className = 'image-container';
  const img = document.createElement('img');
  img.src = objectUrl;
  img.alt = file.name;
  img.className = 'image-preview';
  img.onload = () => URL.revokeObjectURL(objectUrl); // Clean up memory
  imageContainer.appendChild(img);
  
  // Info Column
  const infoSection = document.createElement('div');
  infoSection.className = 'info-section';
  
  // Filename header
  const fileHeader = document.createElement('h3');
  fileHeader.textContent = file.name;
  fileHeader.style.marginTop = '0';
  fileHeader.style.marginBottom = '1rem';
  infoSection.appendChild(fileHeader);

  // Parse SD Parameters
  let sdParams = null;
  if (metadata.parameters) {
    sdParams = parseStableDiffusionParameters(metadata.parameters);
  }

  // Helper to create info item
  const createInfoItem = (label, content, isHtml = false, rawTextForCopy = null) => {
    const item = document.createElement('div');
    item.className = 'info-item';
    
    const labelSpan = document.createElement('span');
    labelSpan.className = 'info-label';
    labelSpan.textContent = label;
    item.appendChild(labelSpan);
    
    const valueDiv = document.createElement('div');
    valueDiv.className = 'info-value';
    
    if (isHtml) {
      valueDiv.innerHTML = content;
    } else {
      valueDiv.textContent = content;
    }
    
    // Copy Button
    const textToCopy = rawTextForCopy !== null ? rawTextForCopy : (isHtml ? valueDiv.innerText : content);
    if (textToCopy && textToCopy !== 'No data') {
      const copyBtn = document.createElement('button');
      copyBtn.className = 'copy-btn';
      copyBtn.textContent = 'Copy';
      copyBtn.onclick = () => {
        navigator.clipboard.writeText(textToCopy);
        copyBtn.textContent = 'Copied!';
        setTimeout(() => copyBtn.textContent = 'Copy', 2000);
      };
      valueDiv.appendChild(copyBtn);
    }
    
    item.appendChild(valueDiv);
    return item;
  };

  if (sdParams) {
    // Prompt with BREAK formatting
    if (sdParams.prompt) {
      // Replace BREAK with BREAK<br> for display
      const formattedPrompt = sdParams.prompt.replace(/\bBREAK\b/g, 'BREAK<br>');
      infoSection.appendChild(createInfoItem('Prompt', formattedPrompt, true, sdParams.prompt));
    } else {
      infoSection.appendChild(createInfoItem('Prompt', 'No data'));
    }

    // Negative Prompt
    if (sdParams.negativePrompt) {
      infoSection.appendChild(createInfoItem('Negative Prompt', sdParams.negativePrompt));
    } else {
      infoSection.appendChild(createInfoItem('Negative Prompt', 'No data'));
    }

    // Other Params
    if (Object.keys(sdParams.params).length > 0) {
      const paramsText = Object.entries(sdParams.params)
        .map(([k, v]) => `<strong>${k}:</strong> ${v}`)
        .join('<br>');
      // Construct raw text for copy
      const rawParamsText = Object.entries(sdParams.params)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');
        
      infoSection.appendChild(createInfoItem('Other Parameters', paramsText, true, rawParamsText));
    } else {
      infoSection.appendChild(createInfoItem('Other Parameters', 'No data'));
    }
  } else {
    infoSection.appendChild(createInfoItem('Prompt', 'No data'));
    infoSection.appendChild(createInfoItem('Negative Prompt', 'No data'));
    infoSection.appendChild(createInfoItem('Other Parameters', 'No data'));
  }

  // Raw Metadata (Collapsible)
  const details = document.createElement('details');
  details.style.marginTop = '2rem';
  
  const summary = document.createElement('summary');
  summary.textContent = 'Raw Metadata';
  details.appendChild(summary);
  
  const rawValueDiv = document.createElement('div');
  rawValueDiv.className = 'info-value';
  rawValueDiv.style.fontSize = '0.8rem';
  
  const rawJson = JSON.stringify(metadata, null, 2);
  rawValueDiv.textContent = Object.keys(metadata).length > 0 ? rawJson : "No text chunks found.";
  
  // Copy button for raw data
  if (Object.keys(metadata).length > 0) {
     const copyBtn = document.createElement('button');
      copyBtn.className = 'copy-btn';
      copyBtn.textContent = 'Copy';
      copyBtn.onclick = () => {
        navigator.clipboard.writeText(rawJson);
        copyBtn.textContent = 'Copied!';
        setTimeout(() => copyBtn.textContent = 'Copy', 2000);
      };
      rawValueDiv.appendChild(copyBtn);
  }

  details.appendChild(rawValueDiv);
  infoSection.appendChild(details);

  card.appendChild(imageContainer);
  card.appendChild(infoSection);

  // Prepend to container
  resultsContainer.insertBefore(card, resultsContainer.firstChild);
}
