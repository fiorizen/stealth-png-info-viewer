import { parsePngInfo, parseStableDiffusionParameters } from './png-parser.js';

const fileInput = document.getElementById('fileInput');
const openBtn = document.getElementById('open-btn');
const resultsContainer = document.getElementById('results-container');
const dragOverlay = document.getElementById('drag-overlay');
const appContainer = document.getElementById('app'); // For scroll snapping

// Store metadata for diff calculation
const cardMetadataMap = new Map();

// --- Drag & Drop (Full Window) ---
let dragCounter = 0;

window.addEventListener('dragenter', (e) => {
  e.preventDefault();
  dragCounter++;
  if (dragCounter === 1) {
    dragOverlay.classList.add('active');
  }
});

window.addEventListener('dragleave', (e) => {
  e.preventDefault();
  dragCounter--;
  if (dragCounter === 0) {
    dragOverlay.classList.remove('active');
  }
});

window.addEventListener('dragover', (e) => {
  e.preventDefault();
});

window.addEventListener('drop', (e) => {
  e.preventDefault();
  dragCounter = 0;
  dragOverlay.classList.remove('active');
  
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    handleFiles(files);
  }
});

// --- Open Button ---
openBtn.addEventListener('click', () => {
  fileInput.click();
});

fileInput.addEventListener('change', (e) => {
  if (e.target.files.length > 0) {
    handleFiles(e.target.files);
  }
  fileInput.value = '';
});

async function handleFiles(files) {
  const filesArray = Array.from(files);
  let hasUpdates = false;
  
  // Process in reverse so first selected is top
  for (const file of filesArray) {
    if (file.type !== 'image/png') {
      console.warn(`Skipping non-PNG file: ${file.name}`);
      continue;
    }
    
    // Check for duplicate filename
    const existingCard = findCardByFilename(file.name);
    if (existingCard) {
      // Remove old card
      existingCard.remove();
      cardMetadataMap.delete(existingCard);
      // Show simple alert/toast (using console for now, maybe custom UI later)
      console.log(`Updated existing file: ${file.name}`);
      // Ideally we'd show a toast here, but standard alert is too intrusive for batch operations
    }

    await processFile(file);
    hasUpdates = true;
  }

  if (hasUpdates) {
    // Snap to top
    appContainer.scrollTop = 0;
  }
}

function findCardByFilename(filename) {
  const cards = Array.from(resultsContainer.children);
  return cards.find(card => {
    const header = card.querySelector('.info-section h3');
    return header && header.textContent === filename;
  });
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
  img.onload = () => URL.revokeObjectURL(objectUrl);
  imageContainer.appendChild(img);
  
  // Info Column
  const infoSection = document.createElement('div');
  infoSection.className = 'info-section';
  
  const fileHeader = document.createElement('h3');
  fileHeader.textContent = file.name;
  fileHeader.style.marginTop = '0';
  fileHeader.style.marginBottom = '1rem';
  infoSection.appendChild(fileHeader);

  let sdParams = null;
  if (metadata.parameters) {
    sdParams = parseStableDiffusionParameters(metadata.parameters);
  }

  // Helper to create info item
  const createInfoItem = (label, content, isHtml = false, rawTextForCopy = null, idPrefix = null) => {
    const item = document.createElement('div');
    item.className = 'info-item';
    
    // Label Container
    const labelContainer = document.createElement('div');
    labelContainer.className = 'info-label';
    
    const labelSpan = document.createElement('span');
    labelSpan.textContent = label;
    labelContainer.appendChild(labelSpan);

    // Copy Button
    const textToCopy = rawTextForCopy !== null ? rawTextForCopy : (isHtml ? content.replace(/<[^>]*>?/gm, '') : content);
    if (textToCopy && textToCopy !== 'No data') {
      const copyBtn = document.createElement('button');
      copyBtn.className = 'copy-btn';
      copyBtn.textContent = 'Copy';
      copyBtn.onclick = () => {
        navigator.clipboard.writeText(textToCopy);
        copyBtn.textContent = 'Copied!';
        setTimeout(() => copyBtn.textContent = 'Copy', 2000);
      };
      labelContainer.appendChild(copyBtn);
    }

    item.appendChild(labelContainer);
    
    // Value Container
    const valueDiv = document.createElement('div');
    valueDiv.className = 'info-value';
    if (idPrefix) valueDiv.dataset.type = idPrefix;
    
    if (isHtml) {
      valueDiv.innerHTML = content;
    } else {
      valueDiv.textContent = content;
    }
    
    item.appendChild(valueDiv);
    return item;
  };

  if (sdParams) {
    if (sdParams.prompt) {
      const formattedPrompt = sdParams.prompt.replace(/\bBREAK(?:,\s?|\s|\b)/g, '$&<br>');
      infoSection.appendChild(createInfoItem('Prompt', formattedPrompt, true, sdParams.prompt, 'prompt'));
    } else {
      infoSection.appendChild(createInfoItem('Prompt', 'No data', false, null, 'prompt'));
    }

    if (sdParams.negativePrompt) {
      infoSection.appendChild(createInfoItem('Negative Prompt', sdParams.negativePrompt, false, null, 'negativePrompt'));
    } else {
      infoSection.appendChild(createInfoItem('Negative Prompt', 'No data', false, null, 'negativePrompt'));
    }

    if (Object.keys(sdParams.params).length > 0) {
      const paramsText = Object.entries(sdParams.params)
        .map(([k, v]) => `<strong>${k}:</strong> <span data-param-key="${k}">${v}</span>`)
        .join('<br>');
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

  // Raw Metadata
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
  
  if (Object.keys(metadata).length > 0) {
     const copyBtn = document.createElement('button');
      copyBtn.className = 'copy-btn';
      copyBtn.textContent = 'Copy';
      copyBtn.style.marginLeft = '1rem';
      copyBtn.onclick = (e) => {
        e.preventDefault();
        navigator.clipboard.writeText(rawJson);
        copyBtn.textContent = 'Copied!';
        setTimeout(() => copyBtn.textContent = 'Copy', 2000);
      };
      summary.appendChild(copyBtn);
  }

  details.appendChild(rawValueDiv);
  infoSection.appendChild(details);

  card.appendChild(imageContainer);
  card.appendChild(infoSection);

  resultsContainer.insertBefore(card, resultsContainer.firstChild);
}

function updateDiffs() {
  const cards = Array.from(resultsContainer.children);
  
  document.querySelectorAll('.diff-highlight').forEach(el => {
    el.classList.remove('diff-highlight');
  });

  if (cards.length < 2) return;

  // In grid layout, "next" card might not be visually "below", but DOM order is preserved.
  // We compare with the next element in DOM (which is the "older" uploaded file).
  for (let i = 0; i < cards.length - 1; i++) {
    const currentCard = cards[i];
    const nextCard = cards[i + 1];
    
    const currentMeta = cardMetadataMap.get(currentCard);
    const nextMeta = cardMetadataMap.get(nextCard);

    if (!currentMeta || !nextMeta) continue;

    const currentSD = currentMeta.parameters ? parseStableDiffusionParameters(currentMeta.parameters) : null;
    const nextSD = nextMeta.parameters ? parseStableDiffusionParameters(nextMeta.parameters) : null;

    if (currentSD && nextSD) {
      diffText(
        currentCard.querySelector('[data-type="prompt"]'),
        currentSD.prompt,
        nextSD.prompt
      );
      diffText(
        currentCard.querySelector('[data-type="negativePrompt"]'),
        currentSD.negativePrompt,
        nextSD.negativePrompt
      );
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
  
  const currentParts = currentText.split(/,\s*/);
  const nextParts = new Set(nextText.split(/,\s*/));
  
  const newHtmlParts = currentParts.map(part => {
    let displayPart = part;
    if (part.includes("BREAK")) {
        displayPart = part.replace(/\bBREAK(?:,\s?|\s|\b)/g, '$&<br>');
    }

    if (!nextParts.has(part.trim())) {
      return `<span class="diff-highlight">${displayPart}</span>`;
    }
    return displayPart;
  });
  
  container.innerHTML = newHtmlParts.join(', ');
}

function diffParams(container, currentParams, nextParams) {
  if (!container) return;
  const paramSpans = container.querySelectorAll('[data-param-key]');
  paramSpans.forEach(span => {
    const key = span.dataset.paramKey;
    if (currentParams[key] !== nextParams[key]) {
      span.classList.add('diff-highlight');
    }
  });
}
