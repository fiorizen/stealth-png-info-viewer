
/**
 * Reads a PNG file and extracts text chunks (tEXt, iTXt).
 * Specifically looks for "parameters" or other common AI metadata fields.
 */
export async function parsePngInfo(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const buffer = event.target.result;
        const metadata = extractPngMetadata(buffer);
        resolve(metadata);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
}

function extractPngMetadata(buffer) {
  const view = new DataView(buffer);
  const metadata = {};
  
  // Check PNG signature
  if (view.getUint32(0) !== 0x89504e47 || view.getUint32(4) !== 0x0d0a1a0a) {
    throw new Error("Not a valid PNG file");
  }

  let offset = 8;
  const decoder = new TextDecoder("utf-8");
  // Latin1 decoder for tEXt chunks which are strictly ISO-8859-1
  const latin1Decoder = new TextDecoder("iso-8859-1");

  while (offset < buffer.byteLength) {
    const length = view.getUint32(offset);
    const type = decoder.decode(buffer.slice(offset + 4, offset + 8));
    
    if (type === "tEXt") {
      const data = new Uint8Array(buffer, offset + 8, length);
      // tEXt format: Keyword + null + Text
      let nullIndex = -1;
      for (let i = 0; i < data.length; i++) {
        if (data[i] === 0) {
          nullIndex = i;
          break;
        }
      }
      
      if (nullIndex !== -1) {
        const keyword = latin1Decoder.decode(data.slice(0, nullIndex));
        const text = latin1Decoder.decode(data.slice(nullIndex + 1));
        metadata[keyword] = text;
      }
    } else if (type === "iTXt") {
      const data = new Uint8Array(buffer, offset + 8, length);
      // iTXt format: Keyword + null + CompFlag + CompMethod + LangTag + null + TransKeyword + null + Text
      let nullIndex = -1;
      for (let i = 0; i < data.length; i++) {
        if (data[i] === 0) {
          nullIndex = i;
          break;
        }
      }
      
      if (nullIndex !== -1) {
        const keyword = latin1Decoder.decode(data.slice(0, nullIndex));
        // Skip compression flag (1 byte), compression method (1 byte)
        // Then find next nulls for LangTag and TransKeyword
        let textStartIndex = nullIndex + 1 + 1 + 1; 
        
        // Skip LangTag
        while (textStartIndex < data.length && data[textStartIndex] !== 0) textStartIndex++;
        textStartIndex++; // Skip null
        
        // Skip TransKeyword
        while (textStartIndex < data.length && data[textStartIndex] !== 0) textStartIndex++;
        textStartIndex++; // Skip null
        
        if (textStartIndex < data.length) {
          const text = decoder.decode(data.slice(textStartIndex));
          metadata[keyword] = text;
        }
      }
    } else if (type === "IEND") {
      break;
    }

    // Move to next chunk: length (4) + type (4) + data (length) + crc (4)
    offset += 12 + length;
  }

  return metadata;
}

/**
 * Parses the "parameters" string from Stable Diffusion into a structured object.
 */
export function parseStableDiffusionParameters(text) {
  if (!text) return null;

  const result = {
    prompt: "",
    negativePrompt: "",
    params: {}
  };

  const lines = text.split('\n');
  let isNegative = false;
  let otherParamsStarted = false;

  for (const line of lines) {
    if (line.startsWith("Negative prompt:")) {
      isNegative = true;
      result.negativePrompt += line.replace("Negative prompt:", "").trim();
    } else if (line.startsWith("Steps:")) {
      otherParamsStarted = true;
      // Parse key-value pairs like "Steps: 20, Sampler: Euler a, ..."
      const parts = line.split(/,\s*(?=\w+:)/); // Split by comma followed by key:
      parts.forEach(part => {
        const [key, ...valParts] = part.split(':');
        if (key && valParts.length > 0) {
          result.params[key.trim()] = valParts.join(':').trim();
        }
      });
    } else {
      if (otherParamsStarted) {
        // Should not happen usually, but maybe extra lines
      } else if (isNegative) {
        result.negativePrompt += "\n" + line;
      } else {
        result.prompt += (result.prompt ? "\n" : "") + line;
      }
    }
  }

  return result;
}
