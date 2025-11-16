import { createServer } from "node:http";
import { BodyParser } from "./middlewares/bodyParser.js";

export const CONTENT_TYPES = {
  JSON: "application/json",
  TEXT: "text/plain",
};

const notFound = () => {
  return {
    statusCode: 404,
    contentType: CONTENT_TYPES.JSON,
  };
};

export default class YAHF {
  // init private fields
  #routes = {};
  #middlewares = [];
  #server;
  #options;
  #logger;

  // static methods
  static #normalizePath(path) {
    if (path.startsWith("/")) {
      return path;
    }
    return `/${path}`;
  }

  // private methods
  #requestInit(req) {
    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    const path = YAHF.#normalizePath(parsedUrl.pathname);
    const query = parsedUrl.searchParams;
    const method = req.method;
    const headers = req.headers;

    return {
      path,
      query,
      method,
      headers,
      req,
    };
  }

  /**
   * Where the magic happens
   * @param {import('http').IncomingMessage} req
   * @param {import('http').ServerResponse} res
   */
  async #handleRequest(req, res) {
    try {
      const data = this.#requestInit(req);
      for (const middleware of this.#middlewares) {
        await middleware(data);
      }
      // remove the raw req object to avoid accidental usage in handlers
      delete data.req;

      const methodRoutes = this.#routes[data.method] || [];
      const route = methodRoutes.find(({ pattern }) => pattern.test(data.path));

      // handle the request
      const handlerResult = await this.#getHandlerResponse(route, data);
      // send the response
      this.#sendResponse(res, handlerResult);
    } catch (err) {
      this.logger(`Error handling request: ${err?.message}`);
      res.statusCode = 500;
      res.end(err?.message);
    }
  }

  #sendResponse(res, handlerResult) {
    res.statusCode = handlerResult?.statusCode || 200;
    const contentType = handlerResult?.contentType || CONTENT_TYPES.JSON;
    res.setHeader("Content-Type", contentType);

    // Set headers to re-write the response
    for (const key in handlerResult?.headers) {
      res.setHeader(key, handlerResult?.headers[key]);
    }

    res.end(this.#serializePayload(handlerResult?.payload, contentType));
  }

  #serializePayload(payload, contentType) {
    if (contentType === CONTENT_TYPES.JSON) {
      return JSON.stringify(payload);
    }
    return payload;
  }

  #getHandlerResponse(route, data) {
    if (!route) {
      return notFound(data);
    }

    const groups = route.pattern.exec(data.path)?.pathname?.groups;
    const handler = route.handler;
    return handler({ ...data, groups });
  }

  // public properties
  get logger() {
    return this.#logger;
  }

  // Public methods
  /**
   * Creates a new instance of the HTTP server.
   * @param {Object} [opts={}] - Configuration options for the server
   * @param {number} [opts.port=1337] - Port number for the server to listen on
   * @param {Function} [opts.logger=console.log] - Logger function to use for server logs
   * @class
   */
  constructor(opts = {}) {
    this.#options = opts;
    this.#options.port = opts.port ?? 1337;
    this.#logger = opts.logger ?? console.log;
    this.#server = createServer();
    this.#middlewares.push(new BodyParser());

    this.#server.on("request", async (req, res) => {
      await this.#handleRequest(req, res);
    });
  }

  useMiddleware(middleware) {
    this.#middlewares.push(middleware);
    return this;
  }

  /**
   * Adds a new route handler for a specific path and method.
   * @param {Object} options - The route handler configuration.
   * @param {string} options.path - The path for the route.
   * @param {string} options.method - The HTTP method for the route.
   * @param {Function} options.handler - The handler function for the route.
   * @returns {YAHF} The YAHF instance for chaining.
   */
  addHandler({ path, method, handler }) {
    // add the handler to the routes for specific path and method
    const normalizedMethod = method.toUpperCase();
    this.#routes[normalizedMethod] = this.#routes[normalizedMethod] ?? [];
    const pattern = new URLPattern({ pathname: YAHF.#normalizePath(path) });
    this.#routes[normalizedMethod].unshift({ pattern, handler });
    return this;
  }

  start() {
    return new Promise((resolve) => {
      this.#server.listen(this.#options.port, () => {
        this.#logger(
          `Started YAHF. Listening on ${this.#server.address().address}:${
            this.#server.address().port
          }`
        );
        resolve(this);
      });
    });
  }

  kill() {
    return new Promise((resolve, reject) => {
      this.#server.close((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}
