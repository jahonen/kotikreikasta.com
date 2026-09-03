// Utility functions for blog post processing

/**
 * Convert markdown to HTML (simple parser)
 */
export function mdToHtml(md: string): string {
  const escape = (s: string) => s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const src = escape(md);
  const lines = src.split(/\r?\n/);
  const out: string[] = [];
  let para: string[] = [];
  let listType: 'ul' | 'ol' | null = null;
  let listItems: string[] = [];
  
  const flushPara = () => {
    if (para.length) {
      out.push(`<p>${para.join('<br />')}</p>`);
      para = [];
    }
  };
  
  const flushList = () => {
    if (listType && listItems.length) {
      out.push(`<${listType}>` + listItems.map((it) => `<li>${it}</li>`).join("") + `</${listType}>`);
    }
    listType = null;
    listItems = [];
  };
  
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^\s*$/.test(line)) { flushPara(); flushList(); continue; }
    const h = /^(#{1,6})\s+(.+)$/.exec(line);
    if (h) { flushPara(); flushList(); const level = Math.min(h[1].length, 6); out.push(`<h${level}>${h[2]}</h${level}>`); continue; }
    const ol = /^\s*\d+\.\s+(.+)$/.exec(line);
    if (ol) { flushPara(); if (listType && listType !== 'ol') flushList(); listType = 'ol'; listItems.push(ol[1]); continue; }
    const ul = /^\s*[-*+]\s+(.+)$/.exec(line);
    if (ul) { flushPara(); if (listType && listType !== 'ul') flushList(); listType = 'ul'; listItems.push(ul[1]); continue; }
    flushList();
    para.push(line.trim());
  }
  
  flushPara();
  flushList();
  
  let html = out.join("\n");
  html = html.replace(/!\[([^\]]*)\]\(([^\)]+)\)/g, '<img src="$2" alt="$1" />');
  html = html.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/(?<!\*)\*(?!\s)(.+?)(?<!\s)\*(?!\*)/g, '<em>$1</em>');
  
  return html;
}

/**
 * Extract plain text from markdown (strip all markdown syntax)
 */
export function stripMarkdown(md: string): string {
  let text = md;
  
  // Remove headings
  text = text.replace(/^#{1,6}\s+/gm, '');
  
  // Remove bold/italic
  text = text.replace(/\*\*(.+?)\*\*/g, '$1');
  text = text.replace(/\*(.+?)\*/g, '$1');
  text = text.replace(/__(.+?)__/g, '$1');
  text = text.replace(/_(.+?)_/g, '$1');
  
  // Remove links but keep text
  text = text.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
  
  // Remove images
  text = text.replace(/!\[([^\]]*)\]\([^\)]+\)/g, '$1');
  
  // Remove code blocks and inline code
  text = text.replace(/```[\s\S]*?```/g, '');
  text = text.replace(/`([^`]+)`/g, '$1');
  
  // Remove blockquotes
  text = text.replace(/^>\s+/gm, '');
  
  // Remove list markers
  text = text.replace(/^\s*[-*+]\s+/gm, '');
  text = text.replace(/^\s*\d+\.\s+/gm, '');
  
  // Remove horizontal rules
  text = text.replace(/^[-*_]{3,}$/gm, '');
  
  // Normalize whitespace
  text = text.replace(/\s+/g, ' ').trim();
  
  return text;
}

/**
 * Extract description from markdown content (first 155 chars of body text)
 */
export function extractDescription(contentMd: string, maxLength: number = 155): string {
  // Remove title (first heading)
  const withoutTitle = contentMd.replace(/^#\s+.*(?:\r?\n|$)/, '');
  
  // Strip all markdown
  const plainText = stripMarkdown(withoutTitle);
  
  // Take first maxLength characters
  if (plainText.length <= maxLength) {
    return plainText;
  }
  
  // Try to break at word boundary
  const truncated = plainText.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > maxLength * 0.8) {
    return truncated.slice(0, lastSpace) + '…';
  }
  
  return truncated + '…';
}
