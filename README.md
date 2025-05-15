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

- `useMiddleware(middleware: (data) => void)`.
  - Any result returned from this functions will be ignored.
  - Will be called in FIFO.
  - Return `this` so it can be chained.

example:

```javascript
import YAHF from "yahf";

const server = new YAHF();
server.useMiddleware((data) => {
  server.logger(data);
});
```

- `addHandler(path:string | string[], handler`: `async data => RequestResult | undefined`.

  - Return `this` so it can be chained.
  - `RequestResult` is optional.

- `RequestResult`

  ```typescript
  {
    statusCode: number; // Defaults to 200
    contentType: string; // Defaults to 'application/json'
    payload: any;
  }
  ```

- `start()` : `Promise<this>`

  - Will start the server, listening on the port was passed in.
  - Resolves to `this` so it can be chained.

- `kill()` : `Promise<void>`

  - Will close the server.

- `logger` : `(str: string) => void`
  - Returns the passed in logger. will default to `console.log`

## YAHF request lifecycle

- Every middleware/handler will get the following object:
  ```typescript
  {
    path: string;
    query: URLSearchParams;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'...;
    headers: object;
    payload?: string; // May be undefined if no body was sent
  }
  ```
- Middlewares are called FIFO, and called before any handler.
- Handlers are called for exact match for the path, without starting `/`.
