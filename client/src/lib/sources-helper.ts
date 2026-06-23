export interface SourceItem {
  title: string;
  url: string;
  domain: string;
}

/**
 * Extracts reference sources from assistant response markdown and returns
 * cleanContent (without raw sources block) and list of sources.
 */
export function extractSourcesAndClean(content: string): { cleanContent: string; sources: SourceItem[] } {
  if (!content) return { cleanContent: "", sources: [] };

  const lines = content.split('\n');
  let sourcesStartIndex = -1;

  // Search for the sources heading
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Check if line is a markdown heading (#, ##, ###) and contains relevant words
    if (line.startsWith('#') && (
      line.toLowerCase().includes('source') || 
      line.toLowerCase().includes('reference') ||
      line.includes('مصادر') || 
      line.includes('المصادر') ||
      line.includes('مراجع') ||
      line.includes('المرجع')
    )) {
      sourcesStartIndex = i;
      break;
    }
  }

  let cleanContent = content;
  let sourcesSectionText = "";

  if (sourcesStartIndex !== -1) {
    const beforeLines = lines.slice(0, sourcesStartIndex);
    const afterLines = lines.slice(sourcesStartIndex);
    
    // Clean content is the text BEFORE the sources heading
    // Strip trailing blank lines or horizontal rules/dividers (---, ***)
    let lastIdx = beforeLines.length - 1;
    while (lastIdx >= 0 && (
      beforeLines[lastIdx].trim() === "" || 
      beforeLines[lastIdx].trim() === "---" || 
      beforeLines[lastIdx].trim() === "***" ||
      beforeLines[lastIdx].trim() === "* * *"
    )) {
      lastIdx--;
    }
    cleanContent = beforeLines.slice(0, lastIdx + 1).join('\n');
    sourcesSectionText = afterLines.join('\n');
  }

  // Parse links from the sources section text
  const sources: SourceItem[] = [];
  if (sourcesSectionText) {
    // Regex matches [Title](URL)
    const linkRegex = /\[([^\]]+)\]\(((?:https?:\/\/|www\.)[^\s\)]+)\)/g;
    let match;
    while ((match = linkRegex.exec(sourcesSectionText)) !== null) {
      const title = match[1].trim();
      let url = match[2].trim();
      if (url.startsWith('www.')) {
        url = 'https://' + url;
      }
      let domain = "";
      try {
        domain = new URL(url).hostname.replace('www.', '');
      } catch (e) {
        domain = url;
      }
      // Deduplicate
      if (!sources.some(s => s.url === url)) {
        sources.push({ title, url, domain });
      }
    }
  }

  return { cleanContent, sources };
}
