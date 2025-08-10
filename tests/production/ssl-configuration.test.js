const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

describe('Production SSL Configuration Tests', () => {
  let dockerComposeProd;
  let nginxMinimalConf;
  let nginxSSLConf;

  beforeAll(() => {
    // Load docker-compose.production.yml
    const dockerComposePath = path.join(__dirname, '../../docker-compose.production.yml');
    const dockerComposeContent = fs.readFileSync(dockerComposePath, 'utf8');
    dockerComposeProd = yaml.load(dockerComposeContent);

    // Load nginx configurations
    const nginxMinimalPath = path.join(__dirname, '../../nginx-minimal.conf');
    nginxMinimalConf = fs.readFileSync(nginxMinimalPath, 'utf8');

    const nginxSSLPath = path.join(__dirname, '../../nginx-ssl.conf');
    nginxSSLConf = fs.readFileSync(nginxSSLPath, 'utf8');
  });

  describe('Frontend Build Configuration', () => {
    test('Frontend should be built with HTTPS URLs when using SSL', () => {
      const frontendService = dockerComposeProd.services.frontend;
      const buildArgs = frontendService.build.args;
      
      const apiUrl = buildArgs.find(arg => arg.includes('VITE_API_URL'));
      const wsUrl = buildArgs.find(arg => arg.includes('VITE_WS_URL'));

      expect(apiUrl).toBeDefined();
      expect(wsUrl).toBeDefined();

      // If using HTTPS/WSS URLs, nginx must have SSL configured
      if (apiUrl.includes('https://')) {
        expect(wsUrl).toContain('wss://');
        
        // Check that nginx service uses SSL-enabled configuration
        const nginxVolumes = dockerComposeProd.services.nginx.volumes;
        const nginxConfigMount = nginxVolumes.find(v => v.includes('/etc/nginx/nginx.conf'));
        
        // This test will fail with current setup - nginx-minimal.conf doesn't support SSL
        expect(nginxConfigMount).not.toContain('nginx-minimal.conf');
        expect(['./nginx-ssl.conf:/etc/nginx/nginx.conf:ro', './nginx.conf:/etc/nginx/nginx.conf:ro'])
          .toContain(nginxConfigMount);
      }
    });

    test('SSL certificates should be mounted when using HTTPS', () => {
      const frontendService = dockerComposeProd.services.frontend;
      const apiUrl = frontendService.build.args.find(arg => arg.includes('VITE_API_URL'));
      
      if (apiUrl && apiUrl.includes('https://')) {
        const nginxVolumes = dockerComposeProd.services.nginx.volumes;
        
        // Check for SSL certificate mount
        const sslMount = nginxVolumes.find(v => v.includes('/etc/nginx/ssl') || v.includes('ssl_certs'));
        expect(sslMount).toBeDefined();
      }
    });
  });

  describe('Nginx Configuration Validation', () => {
    test('nginx-minimal.conf should not listen on 443 without SSL', () => {
      // Check if nginx-minimal.conf has port 443 listener
      const has443Listener = nginxMinimalConf.includes('listen 443');
      const hasSSLConfig = nginxMinimalConf.includes('ssl_certificate');
      
      if (has443Listener) {
        // If listening on 443, must have SSL configuration
        expect(hasSSLConfig).toBe(true);
      }
    });

    test('nginx-ssl.conf should have proper SSL configuration', () => {
      expect(nginxSSLConf).toContain('ssl_certificate /etc/nginx/ssl/fullchain.pem');
      expect(nginxSSLConf).toContain('ssl_certificate_key /etc/nginx/ssl/privkey.pem');
      expect(nginxSSLConf).toContain('listen 443 ssl');
      expect(nginxSSLConf).toContain('ssl_protocols TLSv1.2 TLSv1.3');
    });

    test('Production nginx config should handle HTTP to HTTPS redirect', () => {
      const nginxVolumes = dockerComposeProd.services.nginx.volumes;
      const nginxConfigMount = nginxVolumes.find(v => v.includes('/etc/nginx/nginx.conf'));
      
      if (nginxConfigMount && nginxConfigMount.includes('nginx-ssl.conf')) {
        // SSL config should have HTTP to HTTPS redirect
        expect(nginxSSLConf).toContain('return 301 https://$server_name$request_uri');
      }
    });
  });

  describe('Protocol Consistency', () => {
    test('Frontend URLs and nginx config should use matching protocols', () => {
      const frontendService = dockerComposeProd.services.frontend;
      const apiUrl = frontendService.build.args.find(arg => arg.includes('VITE_API_URL'));
      const nginxVolumes = dockerComposeProd.services.nginx.volumes;
      const nginxConfigMount = nginxVolumes.find(v => v.includes('/etc/nginx/nginx.conf'));
      
      if (apiUrl.includes('https://')) {
        // Frontend expects HTTPS, nginx must be configured for SSL
        expect(nginxConfigMount).toMatch(/nginx-ssl\.conf|nginx\.conf/);
        expect(nginxConfigMount).not.toContain('nginx-minimal.conf');
      } else if (apiUrl.includes('http://')) {
        // Frontend expects HTTP, nginx should not require SSL
        expect(nginxConfigMount).toMatch(/nginx-minimal\.conf|nginx-http-only\.conf/);
      }
    });
  });
});