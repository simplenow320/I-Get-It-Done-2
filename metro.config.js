const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      if (req.url && req.url.startsWith('/api/')) {
        const http = require('http');
        const targetHost = 'localhost';
        const targetPort = 5000;
        
        const options = {
          hostname: targetHost,
          port: targetPort,
          path: req.url,
          method: req.method,
          headers: {
            ...req.headers,
            host: `${targetHost}:${targetPort}`,
          },
        };

        const proxyReq = http.request(options, (proxyRes) => {
          res.writeHead(proxyRes.statusCode, proxyRes.headers);
          proxyRes.pipe(res, { end: true });
        });

        proxyReq.on('error', (err) => {
          console.error('Proxy error:', err);
          res.writeHead(502);
          res.end('Bad Gateway');
        });

        req.pipe(proxyReq, { end: true });
      } else {
        return middleware(req, res, next);
      }
    };
  },
};

module.exports = config;
