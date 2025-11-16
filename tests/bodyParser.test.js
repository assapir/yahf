import assert from "node:assert";
import { describe, it } from "node:test";

import { getRandomPort, createServer, requestYahf } from "./testUtils.js";

describe("BodyParser Middleware", () => {
  it("Parses JSON body with application/json content-type", async () => {
    const port = getRandomPort();
    const server = createServer(port).addHandler({
      path: "data",
      method: "POST",
      handler: (data) => {
        return {
          payload: data.payload,
          contentType: "application/json",
        };
      },
    });

    await server.start();
    const res = await requestYahf(
      "POST",
      "/data",
      port,
      { name: "John", age: 30 },
      "application/json"
    );
    await server.kill();

    const json = await res.json();
    assert.equal(
      res.status,
      200,
      `status code suppose to be 200, but was ${res.status}`
    );
    assert.deepEqual(
      json,
      { name: "John", age: 30 },
      `response body suppose to be { name: 'John', age: 30 }, but was ${JSON.stringify(
        json
      )}`
    );
  });

  it("Parses JSON body with no content-type (defaults to JSON)", async () => {
    const port = getRandomPort();
    const server = createServer(port).addHandler({
      path: "data",
      method: "POST",
      handler: (data) => {
        return {
          payload: data.payload,
          contentType: "application/json",
        };
      },
    });

    await server.start();
    const res = await requestYahf("POST", "/data", port, { test: "value" });
    await server.kill();

    const json = await res.json();
    assert.equal(
      res.status,
      200,
      `status code suppose to be 200, but was ${res.status}`
    );
    assert.deepEqual(
      json,
      { test: "value" },
      `response body suppose to be { test: 'value' }, but was ${JSON.stringify(
        json
      )}`
    );
  });

  it("Parses text/plain body", async () => {
    const port = getRandomPort();
    const server = createServer(port).addHandler({
      path: "text",
      method: "POST",
      handler: (data) => {
        return {
          payload: data.payload,
          contentType: "text/plain",
        };
      },
    });

    await server.start();
    const res = await requestYahf(
      "POST",
      "/text",
      port,
      "Hello, World!",
      "text/plain"
    );
    await server.kill();

    const text = await res.text();
    assert.equal(
      res.status,
      200,
      `status code suppose to be 200, but was ${res.status}`
    );
    assert.equal(
      text,
      "Hello, World!",
      `response body suppose to be 'Hello, World!', but was ${text}`
    );
  });

  it("Handles empty body with text/plain content-type", async () => {
    const port = getRandomPort();
    const server = createServer(port).addHandler({
      path: "text",
      method: "POST",
      handler: (data) => {
        return {
          payload: data.payload || "empty",
          contentType: "text/plain",
        };
      },
    });

    await server.start();
    const res = await requestYahf("POST", "/text", port, null, "text/plain");
    await server.kill();

    const text = await res.text();
    assert.equal(
      res.status,
      200,
      `status code suppose to be 200, but was ${res.status}`
    );
    assert.equal(
      text,
      "empty",
      `response body suppose to be 'empty', but was ${text}`
    );
  });

  it("Handles empty body with JSON content-type", async () => {
    const port = getRandomPort();
    const server = createServer(port).addHandler({
      path: "json",
      method: "POST",
      handler: (data) => {
        return {
          payload: data.payload || { empty: true },
          contentType: "application/json",
        };
      },
    });

    await server.start();
    const res = await requestYahf("POST", "/json", port, null);
    await server.kill();

    const json = await res.json();
    assert.equal(
      res.status,
      200,
      `status code suppose to be 200, but was ${res.status}`
    );
    assert.deepEqual(
      json,
      { empty: true },
      `response body suppose to be { empty: true }, but was ${JSON.stringify(
        json
      )}`
    );
  });

  it("Parses large JSON payloads", async () => {
    const port = getRandomPort();
    const server = createServer(port).addHandler({
      path: "large",
      method: "POST",
      handler: (data) => {
        return {
          payload: {
            itemCount: data.payload.items.length,
            firstItem: data.payload.items[0],
            lastItem: data.payload.items[data.payload.items.length - 1],
          },
          contentType: "application/json",
        };
      },
    });

    const largePayload = {
      items: Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
      })),
    };

    await server.start();
    const res = await requestYahf("POST", "/large", port, largePayload);
    await server.kill();

    const json = await res.json();
    assert.equal(
      res.status,
      200,
      `status code suppose to be 200, but was ${res.status}`
    );
    assert.equal(
      json.itemCount,
      1000,
      `itemCount should be 1000, but was ${json.itemCount}`
    );
    assert.deepEqual(
      json.firstItem,
      { id: 0, name: "Item 0" },
      `firstItem should be { id: 0, name: 'Item 0' }, but was ${JSON.stringify(
        json.firstItem
      )}`
    );
    assert.deepEqual(
      json.lastItem,
      { id: 999, name: "Item 999" },
      `lastItem should be { id: 999, name: 'Item 999' }, but was ${JSON.stringify(
        json.lastItem
      )}`
    );
  });

  it("Parses large text payloads", async () => {
    const port = getRandomPort();
    const server = createServer(port).addHandler({
      path: "largetext",
      method: "POST",
      handler: (data) => {
        return {
          payload: {
            length: data.payload.length,
            first10: data.payload.substring(0, 10),
            last10: data.payload.substring(data.payload.length - 10),
          },
          contentType: "application/json",
        };
      },
    });

    const largeText = "a".repeat(10000);

    await server.start();
    const res = await requestYahf(
      "POST",
      "/largetext",
      port,
      largeText,
      "text/plain"
    );
    await server.kill();

    const json = await res.json();
    assert.equal(
      res.status,
      200,
      `status code suppose to be 200, but was ${res.status}`
    );
    assert.equal(
      json.length,
      10000,
      `length should be 10000, but was ${json.length}`
    );
    assert.equal(
      json.first10,
      "aaaaaaaaaa",
      `first10 should be 'aaaaaaaaaa', but was ${json.first10}`
    );
    assert.equal(
      json.last10,
      "aaaaaaaaaa",
      `last10 should be 'aaaaaaaaaa', but was ${json.last10}`
    );
  });

  it("Handles nested JSON objects", async () => {
    const port = getRandomPort();
    const server = createServer(port).addHandler({
      path: "nested",
      method: "POST",
      handler: (data) => {
        return {
          payload: data.payload,
          contentType: "application/json",
        };
      },
    });

    const nestedPayload = {
      user: {
        name: "Alice",
        address: {
          street: "123 Main St",
          city: "Wonderland",
          coordinates: {
            lat: 40.7128,
            lon: -74.006,
          },
        },
        hobbies: ["reading", "coding"],
      },
    };

    await server.start();
    const res = await requestYahf("POST", "/nested", port, nestedPayload);
    await server.kill();

    const json = await res.json();
    assert.equal(
      res.status,
      200,
      `status code suppose to be 200, but was ${res.status}`
    );
    assert.deepEqual(
      json,
      nestedPayload,
      `response body should match nested payload`
    );
  });

  it("Handles special characters in text/plain", async () => {
    const port = getRandomPort();
    const server = createServer(port).addHandler({
      path: "special",
      method: "POST",
      handler: (data) => {
        return {
          payload: data.payload,
          contentType: "text/plain",
        };
      },
    });

    const specialText = "Hello! @#$%^&*() 你好 🚀 \n\t\r";

    await server.start();
    const res = await requestYahf(
      "POST",
      "/special",
      port,
      specialText,
      "text/plain"
    );
    await server.kill();

    const text = await res.text();
    assert.equal(
      res.status,
      200,
      `status code suppose to be 200, but was ${res.status}`
    );
    assert.equal(
      text,
      specialText,
      `response body should preserve special characters`
    );
  });

  it("Handles JSON arrays", async () => {
    const port = getRandomPort();
    const server = createServer(port).addHandler({
      path: "array",
      method: "POST",
      handler: (data) => {
        return {
          payload: data.payload,
          contentType: "application/json",
        };
      },
    });

    const arrayPayload = [1, 2, 3, "four", { five: 5 }];

    await server.start();
    const res = await requestYahf("POST", "/array", port, arrayPayload);
    await server.kill();

    const json = await res.json();
    assert.equal(
      res.status,
      200,
      `status code suppose to be 200, but was ${res.status}`
    );
    assert.deepEqual(
      json,
      arrayPayload,
      `response body should be [1, 2, 3, "four", { five: 5 }]`
    );
  });

  it("Handles multiline text", async () => {
    const port = getRandomPort();
    const server = createServer(port).addHandler({
      path: "multiline",
      method: "POST",
      handler: (data) => {
        return {
          payload: data.payload,
          contentType: "text/plain",
        };
      },
    });

    const multilineText = `Line 1
Line 2
Line 3`;

    await server.start();
    const res = await requestYahf(
      "POST",
      "/multiline",
      port,
      multilineText,
      "text/plain"
    );
    await server.kill();

    const text = await res.text();
    assert.equal(
      res.status,
      200,
      `status code suppose to be 200, but was ${res.status}`
    );
    assert.equal(
      text,
      multilineText,
      `response body should preserve multiline text`
    );
  });

  it("Responds with 500 when JSON parsing fails (malformed JSON)", async () => {
    const port = getRandomPort();
    const server = createServer(port).addHandler({
      path: "json",
      method: "POST",
      handler: (data) => {
        return {
          payload: data.payload,
          contentType: "application/json",
        };
      },
    });

    await server.start();
    const res = await requestYahf("POST", "/json", port, '{"invalid": json}');
    await server.kill();

    const text = await res.text();
    assert.equal(
      res.status,
      500,
      `status code suppose to be 500, but was ${res.status}`
    );
    assert.match(
      text,
      /Unexpected token/,
      `error message should mention JSON parsing error, but was ${text}`
    );
  });

  it("Responds with 500 when JSON parsing fails (truncated JSON)", async () => {
    const port = getRandomPort();
    const server = createServer(port).addHandler({
      path: "json",
      method: "POST",
      handler: (data) => {
        return {
          payload: data.payload,
          contentType: "application/json",
        };
      },
    });

    await server.start();
    const res = await requestYahf("POST", "/json", port, '{"incomplete": ');
    await server.kill();

    const text = await res.text();
    assert.equal(
      res.status,
      500,
      `status code suppose to be 500, but was ${res.status}`
    );
    assert.match(
      text,
      /Unexpected end of JSON input|Unexpected token/,
      `error message should mention JSON parsing error, but was ${text}`
    );
  });

  it("Responds with 500 when JSON parsing fails (not valid JSON)", async () => {
    const port = getRandomPort();
    const server = createServer(port).addHandler({
      path: "json",
      method: "POST",
      handler: (data) => {
        return {
          payload: data.payload,
          contentType: "application/json",
        };
      },
    });

    await server.start();
    const res = await requestYahf(
      "POST",
      "/json",
      port,
      "this is not json at all"
    );
    await server.kill();

    const text = await res.text();
    assert.equal(
      res.status,
      500,
      `status code suppose to be 500, but was ${res.status}`
    );
    assert.match(
      text,
      /Unexpected token/,
      `error message should mention JSON parsing error, but was ${text}`
    );
  });
});
