import { createServer } from "node:http";
import { BodyParser } from "./middlewares/bodyParser.js";

/**
 * @typedef {Object} ContentTypes
 * @property {string} JSON - The content type for JSON responses
 * @property {string} TEXT - The content type for plain text responses
 */

/**
 * Standard content types for HTTP responses
 * @type {ContentTypes}
 */
export const CONTENT_TYPES = {
  JSON: "application/json",
  TEXT: "text/plain",
};

/**
 * @typedef {Object} RequestData
 * @property {string} path - The normalized path from the URL
 * @property {URLSearchParams} query - The query parameters from the URL
 * @property {string} method - The HTTP method (GET, POST, etc.)
 * @property {Headers} headers - Request headers
 * @property {string|Object} [payload] - The request body (string or parsed object)
 * @property {Object.<string, string>} [groups] - URL pattern groups (path parameters)
 * @property {import('node:http').IncomingMessage} [req] - The raw HTTP request object (available in middlewares)
 */

/**
 * @typedef {Object} HandlerResponse
 * @property {number} [statusCode] - HTTP status code (default: 200)
 * @property {string} [contentType] - Content-Type header value (default: application/json)
 * @property {Headers|Object.<string, string|Array<string>>} [headers] - Additional response headers (either a Web Headers instance or plain object). Arrays are supported for multiple values.
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
   * @returns {RequestData} The parsed request data object
   * @private
   */
  #requestInit(req) {
    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    const path = YAHF.#normalizePath(parsedUrl.pathname);
    const query = parsedUrl.searchParams;
    const method = req.method;
    const headers = this.#buildHeadersFromRaw(req.headers);

    return {
      path,
      query,
      method,
      headers,
      req,
    };
  }

  /**
   * Builds a Web `Headers` object from Node's raw headers.
   * Accepts a plain object (Node's `IncomingMessage.headers`) and
   * converts arrays into multiple header values.
   * @param {Object.<string, string|Array<string>>} rawHeaders
   * @returns {Headers}
   * @private
   */
  #buildHeadersFromRaw(rawHeaders) {
    const headers = new Headers();
    for (const [key, value] of Object.entries(rawHeaders || {})) {
      if (Array.isArray(value)) {
        for (const v of value) {
          headers.append(key, String(v));
        }
      } else if (value !== undefined) {
        headers.set(key, String(value));
      } else {
        headers.set(key, "");
      }
    }

    return headers;
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

  /**
   * Sends the HTTP response to the client
   * @param {import('node:http').ServerResponse} res - The HTTP response object
   * @param {HandlerResponse} handlerResult - The handler result to send
   * @returns {void}
   * @private
   */
  #sendResponse(res, handlerResult) {
    res.statusCode = handlerResult?.statusCode || 200;
    const contentType = handlerResult?.contentType || CONTENT_TYPES.JSON;
    res.setHeader("Content-Type", contentType);

    // Apply headers if provided
    if (handlerResult?.headers) {
      this.#applyResponseHeaders(res, handlerResult.headers);
    }

    res.end(this.#serializePayload(handlerResult?.payload, contentType));
  }

  /**
   * Applies response headers to the Node ServerResponse. Accepts either a
   * Web `Headers` instance or a plain object mapping header names to values
   * (string or array of strings).
   * @param {import('node:http').ServerResponse} res
   * @param {Headers|Object.<string, string|Array<string>>} headers
   * @private
   */
  #applyResponseHeaders(res, headers) {
    const entries = headers instanceof Headers ? headers : Object.entries(headers);

    for (const [key, value] of entries) {
      res.setHeader(key, value);
    }
  }

  /**
   * Serializes the response payload based on content type
   * @param {*} payload - The payload to serialize
   * @param {string} contentType - The content type of the response
   * @returns {string} The serialized payload
   * @private
   */
  #serializePayload(payload, contentType) {
    if (contentType === CONTENT_TYPES.JSON) {
      return JSON.stringify(payload);
    }
    return payload;
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
    this.#middlewares.push(new BodyParser());

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
