// Test the title duplication fix in the plugin

// Simulate the plugin's cleanMarkdownContent function
function cleanMarkdownContent(content) {
  if (!content || typeof content !== 'string') return '';

  let cleanedContent = content;

  // CRITICAL FIX: Remove title H1 from content to prevent duplication
  // Since we extract the title separately, we don't need it in the content
  // Remove ONLY the first H1 (single #) if it appears at the very beginning (after optional frontmatter and whitespace)
  cleanedContent = cleanedContent.replace(/^(---[\s\S]*?---\s*)?(\s*)#\s+.+?(\r?\n|$)/, '$1$2');

  // Only remove potentially harmful content, preserve markdown formatting
  // Keep images but convert to standard markdown format if needed
  
  // Remove only binary attachment links (keep text-based wikilinks)
  const binaryExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 
                           'zip', 'rar', '7z', 'tar', 'gz', 'exe'];
  
  const binaryAttachmentPattern = new RegExp(`\\[\\[([^\\]]+\\.(${binaryExtensions.join('|')}))(\\|[^\\]]*)?\\]\\]`, 'gi');
  cleanedContent = cleanedContent.replace(binaryAttachmentPattern, '');

  // Remove embedded/transcluded content but keep regular images
  cleanedContent = cleanedContent.replace(/!\[\[([^\]]+)\]\]/g, '');

  // Remove only dangerous HTML tags, keep basic ones
  cleanedContent = cleanedContent.replace(/<(script|style|object|embed|iframe)[^>]*>[\s\S]*?<\/\1>/gi, '');
  cleanedContent = cleanedContent.replace(/<(script|style|object|embed|iframe)[^>]*\/>/gi, '');

  // Clean up excessive whitespace but preserve intentional line breaks
  cleanedContent = cleanedContent.replace(/\n\s*\n\s*\n/g, '\n\n');

  return cleanedContent.trim();
}

// Test cases
console.log('🧪 Testing title duplication fix...\n');

// Test 1: Simple H1 at beginning
const test1 = `# My Test Note

This is the content of my note.

## Section 1
Some more content here.`;

const result1 = cleanMarkdownContent(test1);
console.log('Test 1 - Simple H1 removal:');
console.log('Input:', test1.split('\n')[0]);
console.log('Output:', result1.split('\n')[0]);
console.log('✅ H1 removed:', !result1.includes('# My Test Note'));
console.log();

// Test 2: With frontmatter
const test2 = `---
title: My Note
tags: [test]
---

# My Test Note

This is the content with frontmatter.

## Section 1
More content.`;

const result2 = cleanMarkdownContent(test2);
console.log('Test 2 - H1 removal with frontmatter:');
console.log('Input lines:', test2.split('\n').slice(0, 7).join('\n'));
console.log('Output starts:', result2.split('\n').slice(0, 3).join('\n'));
console.log('✅ H1 removed, frontmatter preserved:', result2.includes('title: My Note') && !result2.includes('# My Test Note'));
console.log();

// Test 3: H1 in middle (should NOT be removed)
const test3 = `This is some content.

# This H1 should stay

More content here.`;

const result3 = cleanMarkdownContent(test3);
console.log('Test 3 - H1 in middle (should stay):');
console.log('Input:', test3);
console.log('Output:', result3);
console.log('✅ Middle H1 preserved:', result3.includes('# This H1 should stay'));
console.log();

// Test 4: No H1 (should be unchanged)
const test4 = `This is content without a title.

## Section 1
Some content here.

### Subsection
More details.`;

const result4 = cleanMarkdownContent(test4);
console.log('Test 4 - No H1 (should be unchanged):');
console.log('Input length:', test4.length);
console.log('Output length:', result4.length);
console.log('✅ Content unchanged:', test4.trim() === result4);
console.log();

// Test 5: Multiple H1s (only first should be removed)
const test5 = `# First Title

Content here.

# Second Title Should Stay

More content.`;

const result5 = cleanMarkdownContent(test5);
console.log('Test 5 - Multiple H1s (only first removed):');
console.log('Input:', test5.split('\n').slice(0, 3).join('\n'));
console.log('Output:', result5.split('\n').slice(0, 3).join('\n'));
console.log('✅ First H1 removed, second preserved:', !result5.startsWith('# First Title') && result5.includes('# Second Title Should Stay'));
console.log();

console.log('🎉 Title duplication fix validation complete!');