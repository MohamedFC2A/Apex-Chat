/**
 * Robust JSON parsing utility to clean and repair common LLM syntax formatting errors
 * (e.g. markdown code fences, trailing commas, unescaped literal newlines in values).
 */
export function robustJsonParse<T = any>(text: string): T {
  if (!text) throw new Error("Empty JSON input");
  
  // 1. Remove markdown formatting and backticks
  let clean = text.trim();
  clean = clean.replace(/^```[a-zA-Z-]*\s*/, "");
  clean = clean.replace(/\s*```$/, "");
  clean = clean.trim();
  
  // If it still contains a code block inside, extract it
  const match = clean.match(/```(?:json|pdf-document)?\s*([\s\S]*?)```/i);
  if (match) {
    clean = match[1].trim();
  }

  // 2. Pre-clean common LLM syntax bugs
  // Remove trailing commas before closing brackets or braces
  clean = clean.replace(/,\s*([\]}])/g, "$1");
  
  // Escape literal unescaped newlines inside JSON string values
  clean = clean.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"/g, (m, p1) => {
    return '"' + p1.replace(/\n/g, '\\n').replace(/\r/g, '\\r') + '"';
  });

  try {
    return JSON.parse(clean) as T;
  } catch (error: any) {
    console.warn("[JSON Repair] Standard parse failed, attempting strict extraction:", error.message);
    
    // Attempt to extract the first valid JSON object or array match
    try {
      const firstCurly = clean.indexOf("{");
      const firstBracket = clean.indexOf("[");
      
      let startIdx = -1;
      let endChar = "";
      if (firstCurly !== -1 && (firstBracket === -1 || firstCurly < firstBracket)) {
        startIdx = firstCurly;
        endChar = "}";
      } else if (firstBracket !== -1) {
        startIdx = firstBracket;
        endChar = "]";
      }
      
      if (startIdx !== -1) {
        const lastIdx = clean.lastIndexOf(endChar);
        if (lastIdx > startIdx) {
          const extracted = clean.slice(startIdx, lastIdx + 1);
          const cleanedExtracted = extracted.replace(/,\s*([\]}])/g, "$1");
          return JSON.parse(cleanedExtracted) as T;
        }
      }
    } catch (innerError) {
      // ignore
    }
    
    throw error;
  }
}
