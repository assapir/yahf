import { strict } from "node:assert";
import { test } from "node:test";

import YAHF from "../index.js";
import { getRandomPort, requestYahf } from "./testUtils.js";

test("Handles GET with defaults", async () => {
  const server = new YAHF();
  await server.start();
  const res = await requestYahf("GET", "");
  await server.kill();

  strict.equal(
    res.statusCode,
    404,
    `status code suppose to be 404, but was ${res.statusCode}`
  );
  strict.equal(
    res.headers["content-type"],
    "application/json",
    `content-type suppose to be JSON, but it ${res.headers[`content-type`]}`
  );
});

test("Handles POST with middleware and controller", async () => {
  const port = getRandomPort();
  const server = new YAHF({
    port,
  })
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

  strict.equal(
    res.statusCode,
    201,
    `status code suppose to be 201, but was ${res.statusCode}`
  );
  strict.equal(
    res.headers["content-type"],
    "text/plain",
    `content-type suppose to be text/plain, but it ${
      res.headers[`content-type`]
    }`
  );
  strict.equal(
    res.body,
    "YAHF/0.1.1 and POST",
    `body should have been YAHF/0.1.1, but it was ${res.body}`
  );
  strict.equal(
    res.headers["oh-no"],
    "this is a test",
    `headers should have been set to {'oh-no':'this is a test'}`
  );
});

test("Returns 404 for different methods", async () => {
  const port = getRandomPort();
  const server = new YAHF({
    port,
  }).addHandler({
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

  strict.equal(
    res.statusCode,
    404,
    `status code suppose to be 404, but was ${res.statusCode}`
  );
  strict.equal(
    res.headers["content-type"],
    "application/json",
    `content-type suppose to be JSON, but it ${res.headers[`content-type`]}`
  );
});
