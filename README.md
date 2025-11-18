# YAHF

**Y**et **A**nother **H**TTP **F**ramework, that you don't really need

Trying to build a HTTP server framework, without using any external modules, because who needs `npm` or `yarn`?!

Everything is as I want it to be, not as one might used to.

[![Continuous Integration](https://github.com/assapir/yahf/actions/workflows/ci.yml/badge.svg?event=push)](https://github.com/assapir/yahf/actions/workflows/ci.yml)

## Installation

```sh
npm install yahf
```

or

```sh
yarn add yahf
```

## API

### Constructor

- Create new YAHF instance, with default options

  ```javascript
  import YAHF from "yahf";

  const server = new YAHF();
  ```

- Options that can be passed to the `YAHF` constructor, as an object:

  - `logger`: `(str: string) => void`. Defaults to `console.log`.
  - `port`: `number`. Defaults to 1337.

### Public Methods

- `useMiddleware(middleware: (data) => void | Promise<void>)`.
  - Any result returned from this function will be ignored.
  - Will be called in FIFO order, after the built-in BodyParser.
  - Can be async - middleware functions are awaited.
  - Return `this` so it can be chained.

example:

```javascript
import YAHF from "yahf";

const server = new YAHF();
server.useMiddleware((data) => {
  server.logger(JSON.stringify(data));
});
```

- `addHandler({ path, method, handler })`: Add a route handler.

  - `path`: `string` - The path for the route (e.g., `"echo"` or `"/echo/:id"`)
  - `method`: `string` - The HTTP method (e.g., `"GET"`, `"POST"`, etc.)
  - `handler`: `async (data) => RequestResult | undefined` - The handler function
  - Returns `this` so it can be chained.
  - `RequestResult` is optional.
  - Routes are matched using `URLPattern`, supporting static paths and parameterized routes (e.g., `/echo/:id`).
  - Route precedence follows LIFO (Last In, First Out): the most recently added matching route is selected.

- `RequestResult`

  ```typescript
  {
    statusCode?: number; // Defaults to 200
    contentType?: string; // Defaults to 'application/json'
    payload?: any;
    headers?: Headers|object; // Optional response headers as either a Web `Headers` instance or a plain object. Object values may be strings or arrays of strings for multiple header values.
  }
  ```

- `start()` : `Promise<this>`

  - Will start the server, listening on the port was passed in.
  - Resolves to `this` so it can be chained.

- `kill()` : `Promise<void>`

  - Will close the server.

- `logger` : `(str: string) => void`
  - Returns the passed in logger. will default to `console.log`

## Example Usage

```javascript
import YAHF from "yahf";

const server = new YAHF()
  .useMiddleware((data) => {
    server.logger(`[${data.method}] ${data.path}`);
  })
  .addHandler({
    path: "echo",
    method: "POST",
    handler: async (data) => {
      // data.payload is automatically parsed from JSON, unless Content-Type is different
      return {
        payload: data.payload,
      };
    },
  })
  .addHandler({
    path: "/users/:id",
    method: "GET",
    handler: async (data) => {
      const userId = data.groups.id;
      return {
        statusCode: 200,
        contentType: "application/json",
        payload: { userId }, // Will be automatically stringified, as contentType is application/json by default
      };
    },
  })
  .addHandler({
    path: "/text",
    method: "POST",
    handler: async (data) => {
      // For text/plain requests, data.payload is a string
      return {
        statusCode: 200,
        contentType: "text/plain",
        payload: data.payload.toUpperCase(),
      };
    },
  });

server.start();

### Example scripts

There are ready-made examples in the `examples/` directory which also run as part of CI. Run them locally and call them with curl to see responses. To run all examples locally and validate them automatically, use the `examples` npm script (it will start every `*.js` example on consecutive ports starting at 1338):

```bash
# run all examples and validate
npm run examples
```

- Run the echo example (POST /echo):

```bash
# start the example server on port 1338
PORT=1338 node examples/echo.js

# in another terminal, call it with curl
curl -s -X POST -H "Content-Type: application/json" -d '{"hello":"world"}' http://localhost:1338/echo
```

- Run the headers example (GET /headers) which demonstrates returning a `Headers` instance from a handler:

```bash
# start the headers example on port 1339
PORT=1339 node examples/headers.js

# use curl to fetch a response and show headers
curl -sI http://localhost:1339/headers
```
```

## Built-in Middleware

### BodyParser

YAHF automatically includes a BodyParser middleware that handles request body parsing:

- **JSON parsing** (`application/json`): Automatically parses JSON request bodies and makes them available in `data.payload`
- **Text parsing** (`text/plain`): Parses plain text request bodies
- **Default behavior**: When no `Content-Type` is specified, defaults to JSON parsing
- **Error handling**: Invalid JSON throws an error that results in a 500 response with the error message
- **Empty bodies**: Handled gracefully - `data.payload` will be `undefined` for requests with no body

The BodyParser is automatically added to every YAHF instance and runs before any custom middleware.

## Error Handling

YAHF includes built-in error handling:

- If a middleware throws an error, the request is immediately terminated with a 500 status code
- If a handler throws an error, the request is terminated with a 500 status code
- The error message is sent as the response body
- Errors are logged using the configured logger

Example:

```javascript
server.addHandler({
  path: "/error",
  method: "GET",
  handler: async () => {
    throw new Error("Something went wrong!");
    // Results in: 500 response with body "Something went wrong!"
  },
});
```

## YAHF request lifecycle

- Every middleware/handler will get the following object:
  ```typescript
  {
    path: string;
    query: URLSearchParams;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'...;
    headers: Headers|object;
    payload?: any; // Parsed request body (JSON object, text string, or undefined)
    groups?: object; // Optional URL pattern groups from route matching
  }
  ```
- **BodyParser middleware** runs first, parsing request bodies based on `Content-Type`
- Custom middlewares are called FIFO after the BodyParser
- Handlers are matched based on both path and HTTP method
- Route patterns support parameters (e.g., `/users/:id`) and the matched values are available in `groups`
- If a middleware or handler throws an error, YAHF responds with a 500 status code and the error message
