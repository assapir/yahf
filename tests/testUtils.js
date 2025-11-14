/**
 * @module testUtils
 * @description Utility functions for testing YAHF
 */

import YAHF from "../index.js";

/**
 * Generates a random port number for testing
 * @returns {number} A random port number between 1338 and 2048
 */
export function getRandomPort() {
  return Math.floor(Math.random() * (2048 - 1338) + 1338);
}

/**
 * Creates a new YAHF server instance for testing with a silent logger
 * @param {number} port - The port number for the server
 * @returns {YAHF} A new YAHF server instance
 */
export function createServer(port) {
  return new YAHF({
    port,
    logger: () => {},
  });
}

/**
 * Makes an HTTP request to a YAHF server for testing
 * @param {string} method - The HTTP method (GET, POST, etc.)
 * @param {string} path - The request path
 * @param {number} [port=1337] - The port number of the server
 * @param {string|Object} [body=""] - The request body (string or object to be JSON-stringified)
 * @returns {Promise<Response>} A promise that resolves to the fetch Response object
 */
export async function requestYahf(method, path, port = 1337, body = "") {
  const stringBody =
    typeof body === "string" || !body ? body : JSON.stringify(body);

  const headers = {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(stringBody ?? ""),
    "User-Agent": "YAHF/0.1.1",
  };

  return fetch(`http://localhost:${port}${path}`, {
    method,
    headers,
    body: stringBody ? stringBody : undefined,
  });
}
