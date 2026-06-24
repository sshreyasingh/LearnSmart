const { estimateTokens } = require('./ai.service');

const MAX_TOKENS = 500;
const OVERLAP_TOKENS = 75;

/**
 * Checks if a character is inside a string literal at a given position.
 * Scans backwards to determine if we're in an unclosed quote.
 */
const isInsideString = (text, pos) => {
  let inSingle = false, inDouble = false, inBacktick = false;
  for (let i = 0; i < pos; i++) {
    const c = text[i];
    const prev = i > 0 ? text[i - 1] : '';
    if (prev === '\\') continue;
    if (c === "'" && !inDouble && !inBacktick) inSingle = !inSingle;
    else if (c === '"' && !inSingle && !inBacktick) inDouble = !inDouble;
    else if (c === '`' && !inSingle && !inDouble) inBacktick = !inBacktick;
  }
  return inSingle || inDouble || inBacktick;
};

/**
 * Checks if a position is inside a single-line comment (// or #).
 */
const isInsideLineComment = (line, pos) => {
  const before = line.substring(0, pos);
  const doubleSlash = before.indexOf('//');
  if (doubleSlash !== -1 && !isInsideString(line, doubleSlash)) return true;
  const hashIdx = before.indexOf('#');
  if (hashIdx !== -1 && !isInsideString(line, hashIdx)) return true;
  return false;
};

/**
 * Find the matching closing brace for an opening brace at `openPos` in `text`,
 * handling string literals, template literals, and comments.
 */
const findMatchingBrace = (text, openPos) => {
  let depth = 0;
  let inSingle = false, inDouble = false, inBacktick = false;
  let inBlockComment = false;
  let started = false;

  for (let i = openPos; i < text.length; i++) {
    const c = text[i];
    const prev = i > 0 ? text[i - 1] : '';

    // Track string literals
    if (!inBlockComment && prev !== '\\') {
      if (c === "'" && !inDouble && !inBacktick) { inSingle = !inSingle; continue; }
      if (c === '"' && !inSingle && !inBacktick) { inDouble = !inDouble; continue; }
      if (c === '`' && !inSingle && !inDouble) { inBacktick = !inBacktick; continue; }
    }

    // Skip if inside a string
    if (inSingle || inDouble || inBacktick) continue;

    // Track block comments
    if (!inBlockComment && c === '/' && i + 1 < text.length && text[i + 1] === '*') {
      inBlockComment = true;
      i++; // skip *
      continue;
    }
    if (inBlockComment && c === '*' && i + 1 < text.length && text[i + 1] === '/') {
      inBlockComment = false;
      i++; // skip /
      continue;
    }
    if (inBlockComment) continue;

    // Skip line comments
    if (c === '/' && i + 1 < text.length && text[i + 1] === '/') {
      while (i < text.length && text[i] !== '\n') i++;
      continue;
    }

    if (c === '{') { depth++; started = true; }
    else if (c === '}') { depth--; if (started && depth === 0) return i; }
  }

  return -1; // no match
};

/**
 * Extract function boundaries using character-level analysis.
 * Finds where functions start and uses brace-counting to find their end.
 */
const extractFunctionsWithBraces = (content, language) => {
  const functions = [];
  if (!content) return functions;

  const lines = content.split('\n');
  const lang = (language || '').toLowerCase();
  const isBraceLang = lang.includes('javascript') || lang.includes('typescript') ||
    lang.includes('java') || lang.includes('c++') || lang.includes('c#') ||
    lang.includes('go') || lang.includes('php') || lang.includes('rust') ||
    lang.includes('dart') || lang.includes('kotlin') || lang.includes('scala') ||
    lang.includes('swift');

  const isPython = lang === 'python';

  if (isBraceLang) {
    // Patterns to detect function/class/component starts
    // We match the line up to the opening brace, then use findMatchingBrace
    const startPatterns = [
      // Regular functions: function name() { or async function name() { or function* name() {
      { re: /(?:export\s+(?:default\s+)?)?(?:async\s+)?function\s*\*?\s*(\w+)\s*\(/ },
      // Arrow functions with parens: const name = (...) => {
      { re: /(?:export\s+(?:default\s+)?)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>\s*(?:\{|$)/ },
      // Arrow functions with single param: const name = x => {
      { re: /(?:export\s+(?:default\s+)?)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?(\w+)\s*=>\s*(?:\{|$)/ },
      // Class methods: methodName() { (inside a class or object)
      { re: /\s+(\w+)\s*\([^)]*\)\s*\{$/, minIndent: 1 },
      // Class declaration
      { re: /(?:export\s+(?:default\s+)?)?class\s+(\w+)/ },
      // Object methods: name() { (top-level with no assignment)
      { re: /^(\w+)\s*\([^)]*\)\s*\{$/ },
      // get/set
      { re: /\s+(?:get|set)\s+(\w+)\s*\([^)]*\)\s*\{$/, minIndent: 1 },
    ];

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx];
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) continue;
      if (isInsideLineComment(line, trimmed.length)) continue;

      let matched = false;

      for (const pattern of startPatterns) {
        const match = trimmed.match(pattern.re);
        if (!match) continue;

        // Check min indent requirement
        if (pattern.minIndent) {
          const indent = line.search(/\S/);
          if (indent < pattern.minIndent) continue;
        }

        const name = match[1] || 'anonymous';

        // Find the opening brace — may be on this line or next
        let bracePos = -1;
        let braceLine = lineIdx;

        // Check current line
        const localBrace = line.indexOf('{', 0);
        if (localBrace !== -1) {
          bracePos = content.indexOf('{', content.indexOf(line) + localBrace);
        }

        // If no brace on this line, check subsequent lines
        if (bracePos === -1) {
          let searchIdx = lineIdx + 1;
          while (searchIdx < lines.length) {
            const braceCol = lines[searchIdx].indexOf('{');
            if (braceCol !== -1) {
              // Find the absolute position
              let absPos = 0;
              for (let k = 0; k < searchIdx; k++) absPos += lines[k].length + 1;
              absPos += braceCol;
              bracePos = absPos;
              braceLine = searchIdx;
              break;
            }
            // Stop if we hit another function-like keyword (likely not our function)
            if (searchIdx > lineIdx + 3 && /\b(function|class)\b/.test(lines[searchIdx])) break;
            searchIdx++;
          }
        }

        if (bracePos === -1) continue;

        // Find matching closing brace
        const closePos = findMatchingBrace(content, bracePos);
        if (closePos === -1) continue;

        // Calculate end line
        let endLine = lineIdx;
        let accumulated = 0;
        for (let k = 0; k < lines.length; k++) {
          accumulated += lines[k].length + 1;
          if (accumulated > closePos) { endLine = k; break; }
        }

        // Only extract if substantial (at least 2 lines)
        if (endLine - lineIdx < 1) continue;

        const fnContent = lines.slice(lineIdx, endLine + 1).join('\n');

        // Determine symbol type
        const type = trimmed.includes('class ') ? 'class'
          : name[0] === name[0]?.toUpperCase() && name[0] !== name[0]?.toLowerCase() ? 'component'
          : 'function';

        functions.push({
          name,
          content: fnContent,
          startLine: lineIdx,
          endLine,
          symbolType: type,
        });

        // Skip lines this function occupies
        lineIdx = endLine;
        matched = true;
        break;
      }

      if (matched) continue;
    }
  }

  if (isPython) {
    // Python: functions start with 'def' or 'class', end when indentation goes back
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      const defMatch = trimmed.match(/^(?:async\s+)?def\s+(\w+)\s*\(/);
      const classMatch = trimmed.match(/^class\s+(\w+)/);

      if (defMatch || classMatch) {
        const name = defMatch ? defMatch[1] : classMatch[1];
        const startIndent = lines[i].search(/\S/);

        // Find the function body end: look for a line with same or LESS indentation
        let endLine = i + 1;
        while (endLine < lines.length) {
          const line = lines[endLine];
          if (line.trim() === '' || line.trim().startsWith('#') || line.trim().startsWith('"""') || line.trim().startsWith("'''")) {
            endLine++;
            continue;
          }
          const lineIndent = line.search(/\S/);
          if (lineIndent <= startIndent && line.trim()) break;
          endLine++;
        }
        endLine = Math.max(i + 1, endLine - 1);

        if (endLine - i < 1) continue;

        const fnContent = lines.slice(i, endLine + 1).join('\n');
        functions.push({
          name,
          content: fnContent,
          startLine: i,
          endLine,
          symbolType: classMatch ? 'class' : 'function',
        });

        i = endLine;
      }
    }
  }

  return functions;
};

/**
 * Chunk a single file into semantically meaningful pieces.
 * Uses AST-level function extraction where possible, falls back to line-based splitting.
 */
const chunkFile = (file) => {
  const chunks = [];
  const { content, filePath, fileName, language } = file;

  if (!content) return chunks;

  const lines = content.split('\n');
  const totalTokens = estimateTokens(content);

  // Try to extract functions
  const functions = extractFunctionsWithBraces(content, language);

  if (functions.length > 0) {
    // Process function-level chunks
    const coveredLines = new Set();
    for (const fn of functions) {
      // Mark lines as covered
      for (let l = fn.startLine; l <= fn.endLine; l++) coveredLines.add(l);

      const tokens = estimateTokens(fn.content);
      if (tokens <= MAX_TOKENS) {
        chunks.push({
          filePath, fileName, language,
          content: fn.content,
          startLine: fn.startLine, endLine: fn.endLine,
          functionName: fn.name,
          symbolType: fn.symbolType,
          tokenCount: tokens,
        });
      } else {
        // Function too large — split into sub-chunks
        const fnLines = fn.content.split('\n');
        let currentChunk = '';
        let currentStart = fn.startLine;
        let currentTokens = 0;

        for (let i = 0; i < fnLines.length; i++) {
          const lineTokens = estimateTokens(fnLines[i]);
          if (currentTokens + lineTokens > MAX_TOKENS && currentChunk) {
            chunks.push({
              filePath, fileName, language,
              content: currentChunk,
              startLine: currentStart, endLine: fn.startLine + i - 1,
              functionName: fn.name,
              symbolType: fn.symbolType,
              tokenCount: currentTokens,
              isSubChunk: true,
            });
            currentChunk = '';
            currentStart = fn.startLine + i;
            currentTokens = 0;
          }
          currentChunk += (currentChunk ? '\n' : '') + fnLines[i];
          currentTokens += lineTokens;
        }

        if (currentChunk) {
          chunks.push({
            filePath, fileName, language,
            content: currentChunk,
            startLine: currentStart, endLine: fn.endLine,
            functionName: fn.name,
            symbolType: fn.symbolType,
            tokenCount: currentTokens,
            isSubChunk: true,
          });
        }
      }
    }

    // Chunk any uncovered lines (top-level code, imports, etc.)
    let uncoveredBlocks = [];
    let blockStart = null;
    for (let i = 0; i < lines.length; i++) {
      if (coveredLines.has(i)) {
        if (blockStart !== null) {
          uncoveredBlocks.push({ start: blockStart, end: i - 1, lines: lines.slice(blockStart, i) });
          blockStart = null;
        }
      } else if (blockStart === null) {
        blockStart = i;
      }
    }
    if (blockStart !== null) {
      uncoveredBlocks.push({ start: blockStart, end: lines.length - 1, lines: lines.slice(blockStart) });
    }

    // Group uncovered lines into chunks
    for (const block of uncoveredBlocks) {
      const blockText = block.lines.join('\n');
      const blockTokens = estimateTokens(blockText);
      if (blockTokens <= MAX_TOKENS) {
        const trimmed = blockText.trim();
        if (trimmed) {
          chunks.push({
            filePath, fileName, language,
            content: trimmed,
            startLine: block.start, endLine: block.end,
            tokenCount: blockTokens,
          });
        }
      } else {
        // Split large uncovered block
        let currentChunk = '';
        let currentStart = block.start;
        let currentTokens = 0;
        for (let i = 0; i < block.lines.length; i++) {
          const lineTokens = estimateTokens(block.lines[i]);
          if (currentTokens + lineTokens > MAX_TOKENS && currentChunk) {
            const trimmed = currentChunk.trim();
            if (trimmed) {
              chunks.push({
                filePath, fileName, language,
                content: trimmed,
                startLine: currentStart, endLine: block.start + i - 1,
                tokenCount: currentTokens,
                isSubChunk: true,
              });
            }
            currentChunk = '';
            currentStart = block.start + i;
            currentTokens = 0;
          }
          currentChunk += (currentChunk ? '\n' : '') + block.lines[i];
          currentTokens += lineTokens;
        }
        if (currentChunk.trim()) {
          chunks.push({
            filePath, fileName, language,
            content: currentChunk.trim(),
            startLine: currentStart, endLine: block.end,
            tokenCount: currentTokens,
            isSubChunk: true,
          });
        }
      }
    }
  } else {
    // No functions found — use line-based chunking
    if (totalTokens <= MAX_TOKENS) {
      chunks.push({
        filePath, fileName, language,
        content,
        startLine: 0, endLine: lines.length - 1,
        tokenCount: totalTokens,
      });
    } else {
      const CHUNK_LINES = Math.max(1, Math.floor((MAX_TOKENS * lines.length) / totalTokens));
      for (let i = 0; i < lines.length; i += CHUNK_LINES) {
        const end = Math.min(i + CHUNK_LINES, lines.length);
        const chunkContent = lines.slice(i, end).join('\n').trim();
        if (!chunkContent) continue;
        chunks.push({
          filePath, fileName, language,
          content: chunkContent,
          startLine: i, endLine: end - 1,
          tokenCount: estimateTokens(chunkContent),
          isSubChunk: true,
        });
      }
    }
  }

  return chunks;
};

const chunkAllFiles = async (files, onProgress) => {
  const allChunks = [];
  const total = files.length;

  for (let i = 0; i < total; i++) {
    const chunks = chunkFile(files[i]);
    allChunks.push(...chunks);
    if (onProgress) onProgress({ processed: i + 1, total, chunksSoFar: allChunks.length });
  }

  return allChunks;
};

module.exports = { chunkAllFiles, chunkFile, extractFunctionsWithBraces, MAX_TOKENS };
