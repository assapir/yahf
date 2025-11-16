import { StringDecoder } from "node:string_decoder";
import { CONTENT_TYPES } from "../yahf.js";

export class BodyParser {
  constructor() {
    return this.#parse.bind(this);
  }

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
