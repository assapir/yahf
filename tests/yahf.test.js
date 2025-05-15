import assert from "node:assert";
import { describe, it } from "node:test";

import YAHF from "../index.js";
import { getRandomPort, requestYahf, createServer } from "./testUtils.js";

describe("YAHF", () => {
  it("Handles GET with defaults", async () => {
    const server = new YAHF();
    await server.start();
    const res = await requestYahf("GET", "");
    await server.kill();

    assert.strictEqual(
      res.status,
      404,
      `status code suppose to be 404, but was ${res.status}`
    );
    assert.equal(
      res.headers.get("content-type"),
      "application/json",
      `content-type suppose to be JSON, but it ${res.headers[`content-type`]}`
    );
  });

  it("Handles POST with middleware and controller", async () => {
    const port = getRandomPort();
    const server = createServer(port)
      .useMiddleware((data) => {
        data.payload = `${data.headers["user-agent"]} and ${data.method}`;
      })
      .addHandler({
        path: "echo",
        method: "POST",
        handler: async (data) => {
          return {
            statusCode: 201,
            payload: data.payload,
            contentType: "text/plain",
            headers: {
              "oh-no": "this is a test",
            },
          };
        },
      });
    await server.start();
    const res = await requestYahf("POST", "/echo", port);
    await server.kill();

    const body = await res.text();

    assert.strictEqual(
      res.status,
      201,
      `status code suppose to be 201, but was ${res.status}`
    );
    assert.strictEqual(
      res.headers.get("content-type"),
      "text/plain",
      `content-type suppose to be text/plain, but it ${
        res.headers[`content-type`]
      }`
    );
    assert.strictEqual(
      body,
      "YAHF/0.1.1 and POST",
      `body should have been YAHF/0.1.1, but it was ${body}`
    );
    assert.strictEqual(
      res.headers.get("oh-no"),
      "this is a test",
      `headers should have been set to {'oh-no':'this is a test'}`
    );
  });

  it("Returns 404 for different methods", async () => {
    const port = getRandomPort();
    const server = createServer(port).addHandler({
      path: "echo",
      method: "POST",
      handler: async (data) => {
        return {
          statusCode: 201,
          payload: data.payload,
          contentType: "text/plain",
          headers: {
            "oh-no": "this is a test",
          },
        };
      },
    });
    await server.start();
    const res = await requestYahf("GET", "/echo", port);
    await server.kill();

    assert.equal(
      res.status,
      404,
      `status code suppose to be 404, but was ${res.status}`
    );
    assert.equal(
      res.headers.get("content-type"),
      "application/json",
      `content-type suppose to be JSON, but it ${res.headers[`content-type`]}`
    );
  });

  it("Handles empty body", async () => {
    const port = getRandomPort();
    const server = createServer(port).addHandler({
      path: "echo",
      method: "POST",
      handler: async (data) => {
        return {
          payload: data.payload,
        };
      },
    });

    await server.start();
    const res = await requestYahf("POST", "/echo", port, null);
    await server.kill();
    const body = await res.text();
    assert.equal(body, "", `body should have been empty, but it was ${body}`);
  });
});
