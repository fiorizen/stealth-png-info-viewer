import { parsePngInfo, parseStableDiffusionParameters } from './png-parser.js';

const fileInput = document.getElementById('fileInput');
const openBtn = document.getElementById('open-btn');
const resultsContainer = document.getElementById('results-container');
const dragOverlay = document.getElementById('drag-overlay');
const appContainer = document.getElementById('app');

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
  
  for (const file of filesArray) {
    if (file.type !== 'image/png') {
      console.warn(`Skipping non-PNG file: ${file.name}`);
      continue;
    }
    
    const existingCard = findCardByFilename(file.name);
    if (existingCard) {
      existingCard.remove();
      cardMetadataMap.delete(existingCard);
      console.log(`Updated existing file: ${file.name}`);
    }

    await processFile(file);
    hasUpdates = true;
  }

  if (hasUpdates) {
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

  const removeBtn = document.createElement('div');
  removeBtn.className = 'remove-btn';
  removeBtn.innerHTML = '✕';
  removeBtn.onclick = () => {
    card.remove();
    cardMetadataMap.delete(card);
    updateDiffs();
  };
  card.appendChild(removeBtn);
  
  const imageContainer = document.createElement('div');
  imageContainer.className = 'image-container';
  const img = document.createElement('img');
  img.src = objectUrl;
  img.alt = file.name;
  img.className = 'image-preview';
  img.onload = () => URL.revokeObjectURL(objectUrl);
  imageContainer.appendChild(img);
  
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

  const createInfoItem = (label, content, isHtml = false, rawTextForCopy = null, idPrefix = null) => {
    const item = document.createElement('div');
    item.className = 'info-item';
    
    const labelContainer = document.createElement('div');
    labelContainer.className = 'info-label';
    
    const labelSpan = document.createElement('span');
    labelSpan.textContent = label;
    labelContainer.appendChild(labelSpan);

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
      // Initial display formatting (standard)
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
  
  // Reset all highlights first
  document.querySelectorAll('.diff-highlight').forEach(el => {
    el.classList.remove('diff-highlight');
  });

  if (cards.length < 2) return; // Need at least 2 cards to diff? Actually with bidirectional, maybe not.
  // But if only 1 card, nothing to compare to.

  // Iterate ALL cards to apply bidirectional diffs
  for (let i = 0; i < cards.length; i++) {
    const currentCard = cards[i];
    const currentMeta = cardMetadataMap.get(currentCard);
    if (!currentMeta) continue;
    const currentSD = currentMeta.parameters ? parseStableDiffusionParameters(currentMeta.parameters) : null;
    if (!currentSD) continue;

    const neighbors = [];
    
    // Check Previous (Newer in list)
    if (i > 0) {
      const prevCard = cards[i - 1];
      const prevMeta = cardMetadataMap.get(prevCard);
      if (prevMeta && prevMeta.parameters) {
        neighbors.push(parseStableDiffusionParameters(prevMeta.parameters));
      }
    }
    
    // Check Next (Older in list)
    if (i < cards.length - 1) {
      const nextCard = cards[i + 1];
      const nextMeta = cardMetadataMap.get(nextCard);
      if (nextMeta && nextMeta.parameters) {
        neighbors.push(parseStableDiffusionParameters(nextMeta.parameters));
      }
    }

    if (neighbors.length > 0) {
      // Diff Prompt
      diffText(
        currentCard.querySelector('[data-type="prompt"]'),
        currentSD.prompt,
        neighbors.map(n => n.prompt)
      );
      // Diff Negative Prompt
      diffText(
        currentCard.querySelector('[data-type="negativePrompt"]'),
        currentSD.negativePrompt,
        neighbors.map(n => n.negativePrompt)
      );
      // Diff Other Params
      diffParams(
        currentCard.querySelector('[data-type="otherParams"]'),
        currentSD.params,
        neighbors.map(n => n.params)
      );
    }
  }
}

function diffText(container, currentText, neighborTexts) {
  if (!container || !currentText) return;
  if (!neighborTexts || neighborTexts.length === 0) return;
  
  // Tokenize logic: Split by comma OR BREAK, capturing the delimiters.
  // We match:
  // 1. Comma with optional whitespace: \s*,\s*
  // 2. BREAK with optional whitespace: \s*BREAK\s* (using word boundary to avoid partial matches)
  // The capturing group () ensures these delimiters are included in the result array.
  const splitRegex = /(\s*,\s*|\s*\bBREAK\b\s*)/;
  
  const currentParts = currentText.split(splitRegex);
  
  // Create Sets for neighbors using the same split logic, but filtering out delimiters to only keep meaningful tokens
  const neighborSets = neighborTexts.map(text => {
    if (!text) return new Set();
    const parts = text.split(splitRegex);
    // Filter: keep only parts that are NOT delimiters (commas/BREAK) and NOT empty
    // Actually, we just want to match "content" tokens.
    // A simple heuristic: if it matches the splitRegex, it's a delimiter.
    // But splitRegex matches delimiters. So we can test against it.
    // However, we need to be careful. 'masterpiece' doesn't match. ', ' matches.
    // ' BREAK ' matches.
    return new Set(parts.filter(p => !p.match(splitRegex) && p.trim().length > 0).map(p => p.trim()));
  });
  
  const resultParts = [];

  for (let i = 0; i < currentParts.length; i++) {
    const part = currentParts[i];
    
    // Check if this part is a delimiter
    if (part.match(splitRegex)) {
      // It's a delimiter (comma or BREAK).
      // Apply formatting for BREAK
      let displayPart = part;
      if (part.includes("BREAK")) {
        // If it's just BREAK or BREAK with spaces
        // We want to add a newline.
        // User requested: "BREAK, hoge" -> "BREAK, " -> "hoge" (newline after comma)
        // If the delimiter is just " BREAK ", we probably want " BREAK<br>"
        // If the delimiter is " BREAK, ", we want " BREAK, <br>"
        
        // Replace BREAK with BREAK<br> but be careful about existing structure
        // Actually, let's just append <br> if it contains BREAK.
        // But we need to respect the "newline after comma" rule.
        // If the delimiter ends with comma, we might want <br> after it?
        // Wait, "BREAK, " is a delimiter? Yes, \s*BREAK\s* might not match "BREAK, " if comma is separate.
        // Our regex `(\s*,\s*|\s+BREAK\s*)` treats comma and BREAK as separate delimiters usually,
        // unless they are adjacent without tokens?
        // "BREAK, " -> "BREAK" (token?) ", " (delimiter)?
        // No, BREAK is a keyword, so it should be a delimiter.
        
        // Let's refine the regex to be safe.
        // If we have "BREAK, ", splitRegex `\s+BREAK\s*` matches "BREAK". Then "," matches `\s*,\s*`.
        // So "BREAK, " becomes ["", "BREAK", "", ", ", ""] (empty strings between matches).
        
        // If part contains BREAK, we add <br>.
        // If it's strictly "BREAK" (plus spaces), we add <br> after.
        displayPart = part.replace(/BREAK/, 'BREAK<br>');
      }
      
      // If it's a comma, we don't add <br> unless it was requested?
      // Previous logic: if trimmedPart.endsWith('BREAK') -> separator = ', <br>'
      // Here, if the PREVIOUS token was BREAK, and this is a comma...
      // But we are processing linearly.
      
      // Let's stick to simple: BREAK always gets a <br> after it.
      // If the sequence is "BREAK" -> ", ", then "BREAK<br>" -> ", ". Result: "BREAK\n, " -> weird.
      // User wanted: "BREAK, " -> newline.
      
      // If we have "BREAK, ", we want "BREAK, <br>".
      // This implies we shouldn't put <br> immediately after BREAK if a comma follows.
      
      // This is getting complex to do purely in the loop without lookahead.
      // But let's look at the rendered HTML.
      // "BREAK<br>, " -> Visual: BREAK (newline) ,
      // That looks bad. We want BREAK , (newline).
      
      // So, if the CURRENT part is BREAK, we only add <br> if the NEXT part is NOT a comma.
      // If the NEXT part is a comma, we let the comma handle the <br>?
      // Or we modify the comma.
      
      if (part.includes("BREAK")) {
          // Check next part
          const nextPart = currentParts[i+1];
          const nextIsComma = nextPart && nextPart.match(/^\s*,\s*$/);
          
          if (nextIsComma) {
              displayPart = part; // Don't add <br> yet
          } else {
              displayPart = part.replace(/BREAK/, 'BREAK<br>');
          }
      } else if (part.match(/^\s*,\s*$/)) {
          // It's a comma. Check if PREVIOUS part was BREAK.
          const prevPart = currentParts[i-1];
          const prevIsBreak = prevPart && prevPart.includes("BREAK");
          
          if (prevIsBreak) {
              displayPart = part + '<br>';
          }
      }
      
      resultParts.push(displayPart);
      
    } else {
      // It's a content token (or empty string from split)
      const trimmedPart = part.trim();
      if (trimmedPart.length === 0) {
        resultParts.push(part); // Preserve whitespace
        continue;
      }
      
      // Check for diff
      let isDiff = false;
      for (const neighborSet of neighborSets) {
        if (!neighborSet.has(trimmedPart)) {
            isDiff = true;
            break;
        }
      }
      
      if (isDiff) {
        resultParts.push(`<span class="diff-highlight">${part}</span>`);
      } else {
        resultParts.push(part);
      }
    }
  }
  
  container.innerHTML = resultParts.join('');
}

function diffParams(container, currentParams, neighborParamsList) {
  if (!container) return;
  const paramSpans = container.querySelectorAll('[data-param-key]');
  
  paramSpans.forEach(span => {
    const key = span.dataset.paramKey;
    const currentVal = currentParams[key];
    
    let isDiff = false;
    for (const neighborParams of neighborParamsList) {
        if (currentVal !== neighborParams[key]) {
            isDiff = true;
            break;
        }
    }
    
    if (isDiff) {
      span.classList.add('diff-highlight');
    }
  });
}
