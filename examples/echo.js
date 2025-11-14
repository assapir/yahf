/**
 * @module echo
 * @description Simple echo server example using YAHF
 */

import YAHF from "../src/yahf.js";

/**
 * Echo server that returns the request payload as the response
 * @type {YAHF}
 */
const server = new YAHF().addHandler({
  path: "echo",
  method: "POST",
  handler: async (data) => {
    return {
      payload: data.payload,
    };
  },
});

server.start();
