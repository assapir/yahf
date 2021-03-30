import { createServer } from 'http';
import { StringDecoder } from 'string_decoder';

const CONTENT_TYPES = {
    JSON: 'application/json'
}

const notFound = () => {
    return {
        statusCode: 404,
        contentType: CONTENT_TYPES.JSON
    };
};
export default class YAHF {
    // init private properties
    #routes = {};
    #middlewares = [];

    // private methods
    #requestInit(req) {
        return new Promise((resolve, reject) => {
            // get the url and parse it
            const parsedUrl = new URL(req.url, 'http://localhost:3000');
            // get the path so we can get the route, remove the leading '/' and empty string
            const path = parsedUrl.pathname.split('/').filter(Boolean);
            // get the query string as an object
            const query = parsedUrl.query;
            // get the method
            const method = req.method;
            // get the headers as an object
            const headers = req.headers;
            // get the payload if any
            const decoder = new StringDecoder('utf-8');
            let buffer = '';
            req.on('data', (data) => {
                buffer += decoder.write(data);
            });

            req.on('end', () => {
                buffer += decoder.end();
                const data = {
                    path,
                    query,
                    method,
                    headers,
                    payload: buffer
                };

                resolve(data);
            });

            req.on('error', (err) => {
                reject(err);
            });
        });
    }

    /**
     * Where the magic happens
     * @param {import('http').IncomingMessage} req
     * @param {import('http').ServerResponse} res
     */
    async #handleRequest(req, res) {
        try {
            const data = await this.#requestInit(req, res);
            for (const middleware of this.#middlewares) {
                await middleware(data);
            }

            const handler = this.#routes[data.path] ?? notFound;

            // handle the request
            const handlerResult = await handler(data);
            // send the response
            res.statusCode = handlerResult?.statusCode || 200;
            res.setHeader('Content-Type', handlerResult?.contentType || CONTENT_TYPES.JSON);
            res.end(handlerResult?.payload);
        } catch (err) {
            res.statusCode = 500;
            res.end(err?.message);
        }
    }

    constructor(opts = {}) {
        const { port = 3000, host = 'localhost', logger = console.log } = opts;
        const server = createServer();

        server.on('request', async (req, res) => {
            await this.#handleRequest(req, res);
        });

        server.listen(port, host, () => {
            logger(`YAHF listening on http://${host}:${port}`);
        });
    }

    useMiddleware(middleware) {
        this.#middlewares.push(middleware);
        return this;
    }

    useRoute(path, handler) {
        if (Array.isArray(path)) {
            path.forEach((p, index) => {
                this.#routes[p] = handler[index];
            });
            return this;
        }

        this.#routes[path] = handler;
        return this;
    }
}
