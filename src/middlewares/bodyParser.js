/**
 * @module bodyParser
 * @description Body parsing middleware for YAHF that handles JSON and text payloads
 */

import { StringDecoder } from "node:string_decoder";
import { CONTENT_TYPES } from "../yahf.js";

/**
 * Body parser middleware class for parsing HTTP request bodies
 * @class
 */
export class BodyParser {
  /**
   * Creates a new BodyParser instance
   * @constructor
   * @returns {Function} A bound parse function to be used as middleware
   */
  constructor() {
    return this.#parse.bind(this);
  }

  /**
   * Main parsing method that routes to specific parsers based on content type
   * @param {import('../yahf.js').RequestData} data - The request data object
   * @returns {Promise<void>} A promise that resolves when parsing is complete
   * @private
   */
  #parse(data) {
    const contentType = data.headers["content-type"] || "plain/text";
    switch (contentType) {
      // case "multipart/form-data":
      //   return this.#parseFormData(data);
      // case "application/x-www-form-urlencoded":
      //   return this.#parseURLEncoded(data);
      case CONTENT_TYPES.TEXT:
        return this.#parseText(data);
      case CONTENT_TYPES.JSON:
      default:
        return this.#parseJSON(data);
    }
  }

  /**
   * Parses plain text request body
   * @param {import('../yahf.js').RequestData} data - The request data object
   * @returns {Promise<void>} A promise that resolves when text parsing is complete
   * @private
   */
  #parseText(data) {
    const decoder = new StringDecoder("utf-8");

    let payload = "";
    return new Promise((resolve, reject) => {
      data.req.on("data", (chunk) => {
        payload += decoder.write(chunk);
      });

      data.req.once("end", () => {
        if (payload) {
          payload += decoder.end();
          data.payload = payload;
        }

        resolve();
      });

      data.req.once("error", (err) => {
        reject(err);
      });
    });
  }

  /**
   * Parses JSON request body
   * @param {import('../yahf.js').RequestData} data - The request data object
   * @returns {Promise<void>} A promise that resolves when JSON parsing is complete
   * @throws {Error} If JSON parsing fails
   * @private
   */
  #parseJSON(data) {
    const decoder = new StringDecoder("utf-8");

    let payload = "";
    return new Promise((resolve, reject) => {
      data.req.on("data", (chunk) => {
        payload += decoder.write(chunk);
      });

      data.req.once("end", () => {
        try {
          if (payload) {
            payload += decoder.end();
            data.payload = JSON.parse(payload);
          }

          resolve();
        } catch (err) {
          reject(err);
        }
      });

      data.req.once("error", (err) => {
        reject(err);
      });
    });
  }
}
