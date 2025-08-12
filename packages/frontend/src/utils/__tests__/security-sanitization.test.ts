import { sanitizeTitle, renderSafeTitle } from '../contentSanitizer';

// XSS attack vectors to test
const XSS_PAYLOADS = [
  '<script>alert("xss")</script>',
  '<img src="x" onerror="alert(\'xss\')">',
  '<svg/onload=alert("xss")>',
  'javascript:alert("xss")',
  '<iframe src="javascript:alert(\'xss\')"></iframe>',
  '<body onload=alert("xss")>',
  '<div onclick="alert(\'xss\')">click me</div>',
  '"><script>alert("xss")</script>',
  '\'"--></style></script><script>alert("xss")</script>',
  '<script>document.cookie="xss=true"</script>',
  // Advanced vectors
  'data:text/html,<script>alert("xss")</script>',
  '<style>@import"http://evil.com/xss.css";</style>',
  '<svg><script>alert("xss")</script></svg>',
  'Normal text <script>alert("xss")</script> more text',
  '&lt;script&gt;alert("xss")&lt;/script&gt;'
];

describe('SECURITY: Frontend Title Sanitization', () => {
  describe('sanitizeTitle', () => {
    test.each(XSS_PAYLOADS)('should sanitize XSS payload: %s', (xssPayload) => {
      const result = sanitizeTitle(xssPayload);
      
      // Verify dangerous HTML content is removed (tags, not text content)
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('</script>');
      expect(result).not.toContain('<iframe>');
      expect(result).not.toContain('<svg>');
      expect(result).not.toContain('<img>');
      expect(result).not.toContain('<body>');
      expect(result).not.toContain('<div>');
      expect(result).not.toContain('<style>');
      
      // Event handlers should be stripped
      expect(result).not.toContain('onerror=');
      expect(result).not.toContain('onload=');
      expect(result).not.toContain('onclick=');
      
      // CSS imports should be removed
      expect(result).not.toContain('@import');
      
      // Result should be a string
      expect(typeof result).toBe('string');
      
      // Result should not execute any scripts (this is what matters for security)
      expect(result).not.toMatch(/<[^>]*>/); // No HTML tags should remain
    });

    test('should preserve safe content', () => {
      const safeInputs = [
        'My Document Title',
        'Document #123',
        'Notes from 2024-01-15',
        'Project: Web Security',
        'Meeting Notes (Important)',
        'Title with "quotes" and spaces',
        'Title with émojis 🔒 and unicode',
        ''
      ];

      safeInputs.forEach(safeInput => {
        const result = sanitizeTitle(safeInput);
        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
        
        // Should not be empty unless input was empty
        if (safeInput.trim()) {
          expect(result.length).toBeGreaterThan(0);
        }
      });
    });

    test('should handle edge cases', () => {
      // Null and undefined
      expect(sanitizeTitle(null as any)).toBe('');
      expect(sanitizeTitle(undefined as any)).toBe('');
      
      // Non-string inputs
      expect(sanitizeTitle(123 as any)).toBe('');
      expect(sanitizeTitle({} as any)).toBe('');
      expect(sanitizeTitle([] as any)).toBe('');
      
      // Empty strings
      expect(sanitizeTitle('')).toBe('');
      expect(sanitizeTitle('   ')).toBe('');
    });

    test('should handle mixed content correctly', () => {
      const mixedInputs = [
        'Safe title <script>alert("xss")</script> with dangerous part',
        'Before <img onerror="alert(1)"> after',
        'Text with <b>bold</b> and <script>evil</script>'
      ];

      mixedInputs.forEach(input => {
        const result = sanitizeTitle(input);
        expect(result).not.toContain('<script>');
        expect(result).not.toContain('onerror');
        expect(result).not.toContain('alert');
        
        // Should still contain some content
        expect(result.trim().length).toBeGreaterThan(0);
      });
    });
  });

  describe('renderSafeTitle', () => {
    test.each(XSS_PAYLOADS)('should safely render XSS payload: %s', (xssPayload) => {
      const result = renderSafeTitle(xssPayload);
      
      // Should be safely sanitized (no HTML tags)
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('</script>');
      expect(result).not.toContain('<iframe>');
      expect(result).not.toContain('<svg>');
      expect(result).not.toContain('<img>');
      expect(result).not.toContain('<body>');
      expect(result).not.toContain('<div>');
      expect(result).not.toContain('<style>');
      
      // Event handlers should be stripped
      expect(result).not.toContain('onerror=');
      expect(result).not.toContain('onload=');
      expect(result).not.toContain('onclick=');
      
      // Should return a non-empty string (either sanitized content or placeholder)
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      
      // No HTML tags should remain
      expect(result).not.toMatch(/<[^>]*>/);
    });

    test('should use placeholder for empty/null titles', () => {
      expect(renderSafeTitle('')).toBe('Untitled Document');
      expect(renderSafeTitle(null as any)).toBe('Untitled Document');
      expect(renderSafeTitle(undefined as any)).toBe('Untitled Document');
      expect(renderSafeTitle('   ')).toBe('Untitled Document');
    });

    test('should use custom placeholder', () => {
      const customPlaceholder = 'Custom Placeholder';
      expect(renderSafeTitle('', customPlaceholder)).toBe(customPlaceholder);
      expect(renderSafeTitle(null as any, customPlaceholder)).toBe(customPlaceholder);
    });

    test('should preserve safe titles', () => {
      const safeTitle = 'My Safe Document Title';
      expect(renderSafeTitle(safeTitle)).toBe(safeTitle);
    });
  });

  describe('DOM XSS Prevention', () => {
    // These tests verify that even if sanitization fails, React won't execute scripts
    test('React should not execute scripts from string content', () => {
      // This is more of a documentation test - React automatically escapes string content
      const dangerousString = '<script>alert("xss")</script>';
      const sanitized = sanitizeTitle(dangerousString);
      
      // Our sanitization should have already removed the script
      expect(sanitized).not.toContain('<script>');
      
      // But even if it hadn't, React would escape it when rendering as {sanitized}
      // This test documents that we have defense in depth
      expect(typeof sanitized).toBe('string');
    });

    test('should handle various encoding attempts', () => {
      const encodedXSS = [
        '%3Cscript%3Ealert%28%22xss%22%29%3C%2Fscript%3E', // URL encoded
        '&lt;script&gt;alert("xss")&lt;/script&gt;', // HTML entities
        '\\u003cscript\\u003ealert("xss")\\u003c/script\\u003e' // Unicode escape
      ];

      encodedXSS.forEach(payload => {
        const result = sanitizeTitle(payload);
        // The key is that no HTML tags should remain after sanitization
        expect(result).not.toContain('<script>');
        expect(result).not.toContain('</script>');
        expect(result).not.toMatch(/<[^>]*>/); // No HTML tags
        expect(typeof result).toBe('string');
      });
    });
  });
});

describe('SECURITY: Integration with React Components', () => {
  test('should be safe for use in React components', () => {
    // Simulate how the sanitization would be used in React components
    const userTitle = '<script>alert("xss")</script>Malicious Title';
    const safeTitle = renderSafeTitle(userTitle);
    
    // Verify it's safe to use in React
    expect(safeTitle).not.toContain('<script>');
    expect(safeTitle).not.toContain('alert');
    expect(typeof safeTitle).toBe('string');
    
    // This would be safe to use as: <h1>{safeTitle}</h1>
    // React automatically escapes string content, providing additional protection
  });

  test('should handle complex title structures', () => {
    const complexTitles = [
      'Document: "Project XSS" <script>alert(1)</script>',
      'Meeting Notes [2024] <img onerror="alert(1)">',
      'Report #123 <style>body{background:url("javascript:alert(1)")}</style>',
      'Title with <b>formatting</b> and <script>evil</script> content'
    ];

    complexTitles.forEach(title => {
      const safe = renderSafeTitle(title);
      expect(safe).not.toContain('<script>');
      expect(safe).not.toContain('onerror');
      expect(safe).not.toContain('javascript:');
      expect(safe).not.toContain('<style>');
      
      // Should still contain some meaningful content
      expect(safe.trim().length).toBeGreaterThan(0);
    });
  });
});