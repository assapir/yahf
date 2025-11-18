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
        data.payload = `${data.headers.get("user-agent")} and ${data.method}`;
      })
      .addHandler({
        path: "echo",
        method: "POST",
        handler: async (data) => {
          return {
            statusCode: 201,
            payload: data.payload,
            contentType: "text/plain",
            headers: new Headers({ "oh-no": "this is a test" }),
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

  it("Handles POST with middleware and controller (case insensitive)", async () => {
    const port = getRandomPort();
    const server = createServer(port)
      .useMiddleware((data) => {
        data.payload = `${data.headers.get("user-agent")} and ${data.method}`;
      })
      .addHandler({
        path: "echo",
        method: "post",
        handler: async (data) => {
          return {
            statusCode: 201,
            payload: data.payload,
            contentType: "text/plain",
            headers: new Headers({ "oh-no": "this is a test" }),
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

  it("Accepts response headers as plain object", async () => {
    const port = getRandomPort();
    const server = createServer(port).addHandler({
      path: "obj-headers",
      method: "GET",
      handler: async () => {
        return {
          statusCode: 200,
          payload: "ok",
          contentType: "text/plain",
          headers: { "x-plain": "plain-object" },
        };
      },
    });

    await server.start();
    const res = await requestYahf("GET", "/obj-headers", port);
    await server.kill();

    const body = await res.text();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body, "ok");
    assert.strictEqual(
      res.headers.get("x-plain"),
      "plain-object",
      "Plain object headers should be accepted and appear in the response"
    );
  });

  it("Supports multiple header values from object arrays", async () => {
    const port = getRandomPort();
    const server = createServer(port).addHandler({
      path: "multi",
      method: "GET",
      handler: async () => {
        return {
          statusCode: 200,
          payload: "ok",
          contentType: "text/plain",
          headers: {
            "x-multi": ["alpha", "beta"],
          },
        };
      },
    });

    await server.start();
    const res = await requestYahf("GET", "/multi", port);
    await server.kill();

    const body = await res.text();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body, "ok");
    // Multiple values should be visible as a comma-separated string in fetch
    assert.match(
      res.headers.get("x-multi"),
      /alpha,\s*beta/,
      "array header values should be emitted as combined header"
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
          headers: new Headers({ "oh-no": "this is a test" }),
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
    assert.strictEqual(
      body,
      "",
      `body should have been empty, but it was ${body}`
    );
  });

  it("Handles url pattern", async () => {
    const port = getRandomPort();
    const server = createServer(port).addHandler({
      path: "echo/:id",
      method: "post",
      handler: async (data) => {
        return {
          statusCode: 201,
          payload: data.groups.id,
          contentType: "text/plain",
        };
      },
    });
    await server.start();
    const res = await requestYahf("POST", "/echo/123", port);
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
      "123",
      `body should have been 123, but it was ${body}`
    );
  });

  it("Accumulates request payload and passes it to handler", async () => {
    const port = getRandomPort();
    const server = createServer(port).addHandler({
      path: "body",
      method: "POST",
      handler: async (data) => {
        return {
          payload: data.payload,
        };
      },
    });

    await server.start();
    const res = await requestYahf("POST", "/body", port, { hello: "world" });
    await server.kill();

    const jsonResponse = await res.json();
    assert.equal(
      res.status,
      200,
      `status code suppose to be 200, but was ${res.status}`
    );
    assert.equal(
      res.headers.get("content-type"),
      "application/json",
      `content-type suppose to be JSON, but it ${res.headers[`content-type`]}`
    );
    assert.deepEqual(
      jsonResponse,
      { hello: "world" },
      `response body suppose to be { hello: 'world' }, but was ${jsonResponse}`
    );
  });

  it("Responds with 500 when a middleware throws", async () => {
    const port = getRandomPort();
    const server = createServer(port)
      .useMiddleware(() => {
        throw new Error("boom");
      })
      .addHandler({
        path: "any",
        method: "GET",
        handler: async () => ({ payload: "should not reach" }),
      });

    await server.start();
    const res = await requestYahf("GET", "/any", port);
    await server.kill();

    const text = await res.text();
    assert.equal(
      res.status,
      500,
      `status code suppose to be 500, but was ${res.status}`
    );
    assert.equal(
      text,
      "boom",
      `error message should be 'boom', but was ${text}`
    );
  });

  it("Responds with 500 when a handler throws", async () => {
    const port = getRandomPort();
    const server = createServer(port).addHandler({
      path: "boom",
      method: "GET",
      handler: async () => {
        throw new Error("kaboom");
      },
    });

    await server.start();
    const res = await requestYahf("GET", "/boom", port);
    await server.kill();

    const text = await res.text();
    assert.equal(
      res.status,
      500,
      `status code suppose to be 500, but was ${res.status}`
    );
    assert.equal(
      text,
      "kaboom",
      `error message should be 'kaboom', but was ${text}`
    );
  });

  it("kill() rejects if server is not running", async () => {
    const server = new YAHF();
    await assert.rejects(() => server.kill());
  });

  it("Exposes the configured logger via getter", () => {
    const logger = () => {};
    const server = new YAHF({ port: getRandomPort(), logger });
    assert.strictEqual(
      server.logger,
      logger,
      "logger getter should return the configured logger"
    );
  });

  describe("Routing precedence (LIFO)", () => {
    it("static route added after param route should match first", async () => {
      const port = getRandomPort();
      const server = createServer(port)
        .addHandler({
          path: "echo/:id",
          method: "GET",
          handler: () => ({
            payload: "param",
            contentType: "text/plain",
          }),
        })
        .addHandler({
          path: "echo/static",
          method: "GET",
          handler: () => ({
            payload: "static",
            contentType: "text/plain",
          }),
        });

      await server.start();
      const res = await requestYahf("GET", "/echo/static", port);
      await server.kill();

      const body = await res.text();
      assert.equal(res.status, 200);
      assert.equal(body, "static", `LIFO should pick 'static', got ${body}`);
    });

    it("param route added after static route should match first", async () => {
      const port = getRandomPort();
      const server = createServer(port)
        .addHandler({
          path: "echo/static",
          method: "GET",
          handler: () => ({
            payload: "static",
            contentType: "text/plain",
          }),
        })
        .addHandler({
          path: "echo/:id",
          method: "GET",
          handler: (data) => ({
            payload: `param:${data.groups.id}`,
            contentType: "text/plain",
          }),
        });

      await server.start();
      const res = await requestYahf("GET", "/echo/static", port);
      await server.kill();

      const body = await res.text();
      assert.equal(res.status, 200);
      assert.equal(
        body,
        "param:static",
        `LIFO should pick param route, got ${body}`
      );
    });
  });
});
