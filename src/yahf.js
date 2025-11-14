import { createServer } from "node:http";
import { StringDecoder } from "node:string_decoder";

/**
 * @typedef {Object} ContentTypes
 * @property {string} JSON - The content type for JSON responses
 */

/**
 * Standard content types for HTTP responses
 * @type {ContentTypes}
 */
export const CONTENT_TYPES = {
  JSON: "application/json",
};

/**
 * @typedef {Object} RequestData
 * @property {string} path - The normalized path from the URL
 * @property {URLSearchParams} query - The query parameters from the URL
 * @property {string} method - The HTTP method (GET, POST, etc.)
 * @property {Object.<string, string>} headers - Request headers
 * @property {string} payload - The request body as a string
 * @property {Object.<string, string>} [groups] - URL pattern groups (path parameters)
 */

/**
 * @typedef {Object} HandlerResponse
 * @property {number} [statusCode] - HTTP status code (default: 200)
 * @property {string} [contentType] - Content-Type header value (default: application/json)
 * @property {Object.<string, string>} [headers] - Additional response headers
 * @property {string} [payload] - Response body
 */

/**
 * @callback RouteHandler
 * @param {RequestData} data - The request data
 * @returns {Promise<HandlerResponse>|HandlerResponse} The handler response
 */

/**
 * @callback Middleware
 * @param {RequestData} data - The request data (can be modified)
 * @returns {Promise<void>|void}
 */

/**
 * @typedef {Object} YAHFOptions
 * @property {number} [port=1337] - Port number for the server to listen on
 * @property {Function} [logger=console.log] - Logger function to use for server logs
 */

/**
 * @typedef {Object} RouteConfig
 * @property {string} path - The path pattern for the route
 * @property {string} method - The HTTP method for the route
 * @property {RouteHandler} handler - The handler function for the route
 */

/**
 * @typedef {Object} RouteEntry
 * @property {URLPattern} pattern - The URLPattern for matching requests
 * @property {RouteHandler} handler - The handler function
 * @private
 */

/**
 * Returns a 404 Not Found response
 * @returns {HandlerResponse} The 404 response object
 */
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
  /**
   * Normalizes a path to ensure it starts with a forward slash
   * @param {string} path - The path to normalize
   * @returns {string} The normalized path
   * @private
   */
  static #normalizePath(path) {
    if (path.startsWith("/")) {
      return path;
    }
    return `/${path}`;
  }

  // private methods
  /**
   * Initializes and parses an incoming HTTP request
   * @param {import('node:http').IncomingMessage} req - The incoming HTTP request
   * @returns {Promise<RequestData>} A promise that resolves to the parsed request data
   * @private
   */
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
   * Where the magic happens - handles incoming HTTP requests
   * @param {import('node:http').IncomingMessage} req - The incoming HTTP request
   * @param {import('node:http').ServerResponse} res - The HTTP response object
   * @returns {Promise<void>}
   * @private
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

  /**
   * Gets the handler response for a matched route
   * @param {RouteEntry|undefined} route - The matched route entry
   * @param {RequestData} data - The request data
   * @returns {Promise<HandlerResponse>|HandlerResponse} The handler response
   * @private
   */
  #getHandlerResponse(route, data) {
    if (!route) {
      return notFound(data);
    }

    const groups = route.pattern.exec(data.path)?.pathname?.groups;
    const handler = route.handler;
    return handler({ ...data, groups });
  }

  // public properties
  /**
   * Gets the configured logger function
   * @returns {Function} The logger function
   */
  get logger() {
    return this.#logger;
  }

  // Public methods
  /**
   * Creates a new instance of the HTTP server
   * @param {YAHFOptions} [opts={}] - Configuration options for the server
   * @constructor
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

  /**
   * Adds a middleware function to the middleware stack
   * @param {Middleware} middleware - The middleware function to add
   * @returns {YAHF} The YAHF instance for chaining
   */
  useMiddleware(middleware) {
    this.#middlewares.push(middleware);
    return this;
  }

  /**
   * Adds a new route handler for a specific path and method
   * @param {RouteConfig} config - The route handler configuration
   * @returns {YAHF} The YAHF instance for chaining
   */
  addHandler({ path, method, handler }) {
    // add the handler to the routes for specific path and method
    const normalizedMethod = method.toUpperCase();
    this.#routes[normalizedMethod] = this.#routes[normalizedMethod] ?? [];
    const pattern = new URLPattern({ pathname: YAHF.#normalizePath(path) });
    this.#routes[normalizedMethod].unshift({ pattern, handler });
    return this;
  }

  /**
   * Starts the HTTP server and begins listening for requests
   * @returns {Promise<YAHF>} A promise that resolves with the YAHF instance when the server starts
   */
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

  /**
   * Stops the HTTP server and closes all connections
   * @returns {Promise<void>} A promise that resolves when the server is stopped
   * @throws {Error} If the server encounters an error while closing
   */
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
