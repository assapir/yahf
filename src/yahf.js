import { createServer } from 'http';
import { StringDecoder } from 'string_decoder';

export const CONTENT_TYPES = {
    JSON: 'application/json'
}

const notFound = () => {
    return {
        statusCode: 404,
        contentType: CONTENT_TYPES.JSON
    };
};
export default class YAHF {
    // init private fields
    #routes = {};
    #middlewares = [];
    #server;
    #options;
    #logger;

    // private methods
    #requestInit(req) {
        return new Promise((resolve, reject) => {
            // get the url and parse it
            const parsedUrl = new URL(req.url, 'http://localhost:3000');
            // get the path so we can get the route, remove the leading '/' and empty string
            const path = parsedUrl.pathname.substring(1);
            // get the query string as an object
            const query = parsedUrl.search;
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

            req.once('end', () => {
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

            req.once('error', err => {
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
            const data = await this.#requestInit(req);
            for (const middleware of this.#middlewares) {
                await middleware(data);
            }

            const handler = this.#routes[data.path] ?? notFound;

            // handle the request
            const handlerResult = await handler(data);
            // send the response
            res.statusCode = handlerResult?.statusCode || 200;
            res.setHeader('Content-Type', handlerResult?.contentType || CONTENT_TYPES.JSON);
            // Set headers to re-write the response
            for (const key in handlerResult?.headers) {
                res.setHeader(key, handlerResult?.headers[key]);
            }
            res.end(handlerResult?.payload);
        } catch (err) {
            res.statusCode = 500;
            res.end(err?.message);
        }
    }

    // public properties
    get logger() { return this.#logger; }

    // Public methods
    constructor(opts = {}) {
        this.#options = opts;
        this.#logger = opts.logger ?? console.log;
        this.#server = createServer();

        this.#server.on('request', async (req, res) => {
            await this.#handleRequest(req, res);
        });


    }

    useMiddleware(middleware) {
        this.#middlewares.push(middleware);
        return this;
    }

    addHandler(path, handler) {
        if (Array.isArray(path)) {
            path.forEach((p, index) => {
                this.#routes[p] = handler[index];
            });
            return this;
        }

        this.#routes[path] = handler;
        return this;
    }

    start() {
        return new Promise((resolve) => {
            this.#server.listen(this.#options.port ?? 1337, () => {
                this.#logger(`Started YAHF. Listening on ${this.#server.address().address}:${this.#server.address().port}`);
                resolve(this)
            });
        });
    }

    kill() {
        return new Promise((resolve, reject) =>{
            this.#server.close(err => {
                if (err) {
                    reject(err);
                } else {
                    resolve(this);
                }
            });
        });
    }
}
