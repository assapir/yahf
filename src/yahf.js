import { createServer } from "node:http";
import { StringDecoder } from "node:string_decoder";

export const CONTENT_TYPES = {
  JSON: "application/json",
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
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
      const path = YAHF.#normalizePath(parsedUrl.pathname);
      const query = parsedUrl.searchParams;
      const method = req.method;
      const headers = req.headers;
      // get the payload if any
      const decoder = new StringDecoder("utf-8");

      let payload = "";
      req.on("data", (data) => {
        payload += decoder.write(data);
      });

      req.once("end", () => {
        if (payload) {
          payload += decoder.end();
        }
        const data = {
          path,
          query,
          method,
          headers,
          payload,
        };

        resolve(data);
      });

      req.once("error", (err) => {
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

      const methodRoutes = this.#routes[data.method] || [];
      const route = methodRoutes.find(({ pattern }) => pattern.test(data.path));

      // handle the request
      const handlerResult = await this.#getHandlerResponse(route, data);
      // send the response
      res.statusCode = handlerResult?.statusCode || 200;
      res.setHeader(
        "Content-Type",
        handlerResult?.contentType || CONTENT_TYPES.JSON
      );

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
