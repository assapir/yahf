import YAHF from './yahf.js';
import { createServer } from 'http';

/**
 * Create and start the Http server.
 * @param {object} opts
 */
YAHF.init = (opts = {}) => {
  const { port = 3000, host = 'localhost', logger = console.log } = opts;
  const server = createServer();

  server.on('request', async (req, res) => {
    await YAHF.handleRequest(req, res);
  });

  server.listen(port, host, () => {
    logger(`YAHF listening on http://${host}:${port}`);
  });
}

export default YAHF;
