import { parsePngInfo, parseStableDiffusionParameters } from './png-parser.js';

const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const resultsContainer = document.getElementById('results-container');

// Store metadata for diff calculation
// Map<CardElement, MetadataObject>
const cardMetadataMap = new Map();

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
    updateDiffs();
  } catch (error) {
    console.error(`Error parsing ${file.name}:`, error);
    alert(`Error parsing ${file.name}: ` + error.message);
  }
}

function createResultCard(file, metadata) {
  const objectUrl = URL.createObjectURL(file);
  
  const card = document.createElement('div');
  card.className = 'glass-card result-card';
  
  // Store metadata on the card element for easy access during diff
  cardMetadataMap.set(card, metadata);

  // Remove Button
  const removeBtn = document.createElement('div');
  removeBtn.className = 'remove-btn';
  removeBtn.innerHTML = '✕';
  removeBtn.onclick = () => {
    card.remove();
    cardMetadataMap.delete(card);
    updateDiffs();
  };
  card.appendChild(removeBtn);
  
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
  const createInfoItem = (label, content, isHtml = false, rawTextForCopy = null, idPrefix = null) => {
    const item = document.createElement('div');
    item.className = 'info-item';
    
    const labelSpan = document.createElement('span');
    labelSpan.className = 'info-label';
    labelSpan.textContent = label;
    item.appendChild(labelSpan);
    
    const valueDiv = document.createElement('div');
    valueDiv.className = 'info-value';
    if (idPrefix) valueDiv.dataset.type = idPrefix; // Mark for diffing
    
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
      // Replace BREAK with BREAK<br> for display (handling optional comma/space)
      const formattedPrompt = sdParams.prompt.replace(/\bBREAK(?:,\s?|\s|\b)/g, '$&<br>');
      infoSection.appendChild(createInfoItem('Prompt', formattedPrompt, true, sdParams.prompt, 'prompt'));
    } else {
      infoSection.appendChild(createInfoItem('Prompt', 'No data', false, null, 'prompt'));
    }

    // Negative Prompt
    if (sdParams.negativePrompt) {
      infoSection.appendChild(createInfoItem('Negative Prompt', sdParams.negativePrompt, false, null, 'negativePrompt'));
    } else {
      infoSection.appendChild(createInfoItem('Negative Prompt', 'No data', false, null, 'negativePrompt'));
    }

    // Other Params
    if (Object.keys(sdParams.params).length > 0) {
      const paramsText = Object.entries(sdParams.params)
        .map(([k, v]) => `<strong>${k}:</strong> <span data-param-key="${k}">${v}</span>`)
        .join('<br>');
      // Construct raw text for copy
      const rawParamsText = Object.entries(sdParams.params)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');
        
      infoSection.appendChild(createInfoItem('Other Parameters', paramsText, true, rawParamsText, 'otherParams'));
    } else {
      infoSection.appendChild(createInfoItem('Other Parameters', 'No data', false, null, 'otherParams'));
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

/**
 * Updates diff highlighting for all cards.
 * Compares each card with the one immediately following it (the "older" one).
 */
function updateDiffs() {
  const cards = Array.from(resultsContainer.children);
  
  // Reset all highlights first
  document.querySelectorAll('.diff-highlight').forEach(el => {
    el.classList.remove('diff-highlight');
  });

  if (cards.length < 2) return;

  for (let i = 0; i < cards.length - 1; i++) {
    const currentCard = cards[i];
    const nextCard = cards[i + 1]; // The older card
    
    const currentMeta = cardMetadataMap.get(currentCard);
    const nextMeta = cardMetadataMap.get(nextCard);

    if (!currentMeta || !nextMeta) continue;

    const currentSD = currentMeta.parameters ? parseStableDiffusionParameters(currentMeta.parameters) : null;
    const nextSD = nextMeta.parameters ? parseStableDiffusionParameters(nextMeta.parameters) : null;

    if (currentSD && nextSD) {
      // Diff Prompt
      diffText(
        currentCard.querySelector('[data-type="prompt"]'),
        currentSD.prompt,
        nextSD.prompt
      );

      // Diff Negative Prompt
      diffText(
        currentCard.querySelector('[data-type="negativePrompt"]'),
        currentSD.negativePrompt,
        nextSD.negativePrompt
      );

      // Diff Other Params
      diffParams(
        currentCard.querySelector('[data-type="otherParams"]'),
        currentSD.params,
        nextSD.params
      );
    }
  }
}

function diffText(container, currentText, nextText) {
  if (!container || !currentText || !nextText) return;
  
  // Simple diff by comma-separated parts
  // This re-renders the content to apply highlights
  
  const currentParts = currentText.split(/,\s*/);
  const nextParts = new Set(nextText.split(/,\s*/));
  
  // Reconstruct HTML with highlights
  // Note: We need to preserve BREAK formatting logic here too if we overwrite innerHTML
  // But for simplicity, let's just highlight segments that are NOT in the nextText
  
  // Strategy: We will rebuild the HTML string.
  // If a part is not in nextParts, wrap it in <span class="diff-highlight">
  
  const newHtmlParts = currentParts.map(part => {
    let displayPart = part;
    // Handle BREAK formatting
    if (part.includes("BREAK")) {
        displayPart = part.replace(/\bBREAK(?:,\s?|\s|\b)/g, '$&<br>');
    }

    if (!nextParts.has(part.trim())) {
      return `<span class="diff-highlight">${displayPart}</span>`;
    }
    return displayPart;
  });
  
  // Join back with commas, but we need to be careful not to double commas if we split by them
  // The split removed delimiters. Let's add them back loosely.
  // Actually, replacing the whole content removes the "Copy" button.
  // We need to re-append the copy button.
  
  const newHtml = newHtmlParts.join(', ');
  
  // Preserve copy button
  const copyBtn = container.querySelector('.copy-btn');
  container.innerHTML = newHtml;
  if (copyBtn) container.appendChild(copyBtn);
}

function diffParams(container, currentParams, nextParams) {
  if (!container) return;
  
  // Iterate over spans with data-param-key
  const paramSpans = container.querySelectorAll('[data-param-key]');
  
  paramSpans.forEach(span => {
    const key = span.dataset.paramKey;
    const currentVal = currentParams[key];
    const nextVal = nextParams[key];
    
    if (currentVal !== nextVal) {
      span.classList.add('diff-highlight');
    }
  });
}
