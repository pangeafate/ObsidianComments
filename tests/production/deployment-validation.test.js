const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

describe('Production Deployment Validation', () => {
  let dockerComposeProd;
  let nginxSSLConf;
  let backendAppContent;

  beforeAll(() => {
    // Load all necessary files
    const dockerComposePath = path.join(__dirname, '../../docker-compose.production.yml');
    dockerComposeProd = yaml.load(fs.readFileSync(dockerComposePath, 'utf8'));

    const nginxSSLPath = path.join(__dirname, '../../nginx-ssl.conf');
    nginxSSLConf = fs.readFileSync(nginxSSLPath, 'utf8');

    const backendAppPath = path.join(__dirname, '../../packages/backend/src/app.ts');
    backendAppContent = fs.readFileSync(backendAppPath, 'utf8');
  });

  describe('Complete Production Configuration', () => {
    test('Frontend and nginx should use matching protocols (HTTPS/WSS)', () => {
      const frontendService = dockerComposeProd.services.frontend;
      const nginxService = dockerComposeProd.services.nginx;
      
      // Check frontend build args
      const apiUrl = frontendService.build.args.find(arg => arg.includes('VITE_API_URL'));
      const wsUrl = frontendService.build.args.find(arg => arg.includes('VITE_WS_URL'));
      
      expect(apiUrl).toContain('https://');
      expect(wsUrl).toContain('wss://');
      
      // Check nginx config mount
      const nginxConfigMount = nginxService.volumes.find(v => v.includes('/etc/nginx/nginx.conf'));
      expect(nginxConfigMount).toContain('nginx-ssl.conf');
      
      // Check SSL certificates are mounted
      const sslMount = nginxService.volumes.find(v => v.includes('/etc/nginx/ssl'));
      expect(sslMount).toBeDefined();
    });

    test('Nginx server_name should be properly configured', () => {
      // Check HTTP block
      const httpBlockMatch = nginxSSLConf.match(/server\s*{[^}]*listen\s+80[^}]*}[^}]*}/);
      expect(httpBlockMatch).toBeTruthy();
      
      const httpBlock = httpBlockMatch[0];
      expect(httpBlock).toContain('server_name obsidiancomments.serverado.app');
      expect(httpBlock).not.toContain('server_name obsidiancomments.serverado.app _');
      expect(httpBlock).toContain('return 301 https://');
      
      // Check HTTPS block
      const httpsBlockMatch = nginxSSLConf.match(/server\s*{[^}]*listen\s+443[^}]*}[^}]*}/);
      expect(httpsBlockMatch).toBeTruthy();
      
      const httpsBlock = httpsBlockMatch[0];
      expect(httpsBlock).toContain('server_name obsidiancomments.serverado.app');
      // Check that server_name doesn't have underscore wildcard
      const serverNameMatch = httpsBlock.match(/server_name\s+([^;]+);/);
      if (serverNameMatch) {
        expect(serverNameMatch[1]).not.toContain('_');
      }
      expect(httpsBlock).toContain('ssl_certificate');
    });

    test('CORS should use environment variable', () => {
      // Check backend app.ts uses CORS_ORIGIN env var
      expect(backendAppContent).toContain('process.env.CORS_ORIGIN');
      expect(backendAppContent).toContain('.split');
      
      // Check docker-compose sets CORS_ORIGIN
      const backendEnv = dockerComposeProd.services.backend.environment;
      const corsOriginSetting = backendEnv.find(e => e.includes('CORS_ORIGIN'));
      expect(corsOriginSetting).toBeDefined();
    });

    test('All required SSL volumes should be defined', () => {
      const volumes = dockerComposeProd.volumes;
      
      expect(volumes).toHaveProperty('ssl_certs');
      expect(volumes).toHaveProperty('certbot_webroot');
      expect(volumes).toHaveProperty('nginx_logs');
    });

    test('Services should have proper health checks', () => {
      const services = ['postgres', 'redis', 'backend', 'hocuspocus', 'frontend', 'nginx'];
      
      services.forEach(serviceName => {
        const service = dockerComposeProd.services[serviceName];
        expect(service.healthcheck).toBeDefined();
        expect(service.healthcheck.test).toBeDefined();
      });
    });

    test('Backend should trust proxy for nginx', () => {
      expect(backendAppContent).toContain("app.set('trust proxy'");
    });

    test('Production compose should use proper networking', () => {
      expect(dockerComposeProd.networks).toHaveProperty('obsidian_network');
      
      // All services should be on the same network
      const services = Object.values(dockerComposeProd.services);
      services.forEach(service => {
        if (service.networks) {
          expect(service.networks).toContain('obsidian_network');
        }
      });
    });

    test('Critical environment variables should be configured', () => {
      const backendEnv = dockerComposeProd.services.backend.environment;
      
      // Check for required env vars
      const requiredVars = ['NODE_ENV=production', 'DATABASE_URL', 'REDIS_URL', 'JWT_SECRET'];
      requiredVars.forEach(varPattern => {
        const hasVar = backendEnv.some(e => e.includes(varPattern));
        expect(hasVar).toBe(true);
      });
    });
  });

  describe('Deployment Readiness', () => {
    test('No services should expose unnecessary ports', () => {
      // Only nginx should expose ports
      const servicesWithPorts = Object.entries(dockerComposeProd.services)
        .filter(([name, service]) => service.ports && name !== 'nginx');
      
      expect(servicesWithPorts).toHaveLength(0);
    });

    test('All services should use restart policy', () => {
      Object.values(dockerComposeProd.services).forEach(service => {
        expect(service.restart).toBe('unless-stopped');
      });
    });

    test('Dependencies should be properly configured', () => {
      const backend = dockerComposeProd.services.backend;
      expect(backend.depends_on).toHaveProperty('postgres');
      expect(backend.depends_on).toHaveProperty('redis');
      
      const nginx = dockerComposeProd.services.nginx;
      expect(nginx.depends_on).toHaveProperty('frontend');
      expect(nginx.depends_on).toHaveProperty('backend');
      expect(nginx.depends_on).toHaveProperty('hocuspocus');
    });
  });
});