const fs = require('fs');
const path = require('path');

describe('Nginx Server Configuration Tests', () => {
  let nginxSSLConf;
  let nginxMinimalConf;

  beforeAll(() => {
    const nginxSSLPath = path.join(__dirname, '../../nginx-ssl.conf');
    nginxSSLConf = fs.readFileSync(nginxSSLPath, 'utf8');

    const nginxMinimalPath = path.join(__dirname, '../../nginx-minimal.conf');
    nginxMinimalConf = fs.readFileSync(nginxMinimalPath, 'utf8');
  });

  describe('Server Name Configuration', () => {
    test('nginx-ssl.conf should not mix specific domain with wildcard', () => {
      // Extract server blocks
      const serverBlocks = nginxSSLConf.match(/server\s*{[^}]+}/g) || [];
      
      serverBlocks.forEach(block => {
        // Check if block has server_name directive
        const serverNameMatch = block.match(/server_name\s+([^;]+);/);
        if (serverNameMatch) {
          const serverNames = serverNameMatch[1].trim();
          
          // Should not have both specific domain and underscore wildcard in same directive
          if (serverNames.includes('obsidiancomments.serverado.app')) {
            expect(serverNames).not.toContain('_');
          }
          
          // If using underscore wildcard, should also have default_server
          if (serverNames === '_') {
            expect(block).toContain('default_server');
          }
        }
      });
    });

    test('nginx-ssl.conf should include all necessary domain variants', () => {
      const serverBlocks = nginxSSLConf.match(/server\s*{[^}]+}/g) || [];
      
      // Find HTTPS server block
      const httpsBlock = serverBlocks.find(block => block.includes('listen 443'));
      
      if (httpsBlock) {
        const serverNameMatch = httpsBlock.match(/server_name\s+([^;]+);/);
        if (serverNameMatch) {
          const serverNames = serverNameMatch[1].trim();
          
          // Should include the primary domain
          expect(serverNames).toContain('obsidiancomments.serverado.app');
          
          // Should handle www variant or use default_server
          const hasWWW = serverNames.includes('www.obsidiancomments.serverado.app');
          const hasDefault = httpsBlock.includes('default_server');
          
          expect(hasWWW || hasDefault).toBe(true);
        }
      }
    });

    test('nginx-ssl.conf HTTP block should redirect properly', () => {
      // Find HTTP server block including nested locations
      const httpBlockMatch = nginxSSLConf.match(/server\s*{[^}]*listen\s+80[^}]*}[^}]*}/);
      
      if (httpBlockMatch) {
        const httpBlock = httpBlockMatch[0];
        // Should have proper redirect to HTTPS
        expect(httpBlock).toContain('return 301 https://');
        
        // Server name should match HTTPS block
        const serverNameMatch = httpBlock.match(/server_name\s+([^;]+);/);
        if (serverNameMatch) {
          const serverNames = serverNameMatch[1].trim();
          expect(serverNames).toContain('obsidiancomments.serverado.app');
        }
      }
    });

    test('Production nginx should use default_server for catch-all', () => {
      const serverBlocks = nginxSSLConf.match(/server\s*{[^}]+}/g) || [];
      
      // Check if any server block is marked as default
      const hasDefaultHTTP = serverBlocks.some(block => 
        block.includes('listen 80') && block.includes('default_server')
      );
      
      const hasDefaultHTTPS = serverBlocks.some(block => 
        block.includes('listen 443') && block.includes('default_server')
      );
      
      // At least one of them should be default
      expect(hasDefaultHTTP || hasDefaultHTTPS).toBe(true);
    });
  });
});