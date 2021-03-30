# YAHF
**Y**et **A**nother **H**TTP **F**ramework, that you don't really need

Trying to build a HTTP server framework, without using any external modules, because who needs npm?!

Everything is as I want it to be, not as one might used to.

## API

* Create new YAHF instance, with default options
  ```javascript
  import YAHF from 'yahf';

  const server = new YAHF();
  ```

* Options that can be passed to the `YAHF` constructor, as an object:
  * `logger`: `(str: string) => void`. Defaults to `console.log`.
  * `port`: `number`. Defaults to 1337.

* `useMiddleware(middleware: (data) => void)`.
  * Any result returned from this functions will be ignored.
  * Will be called in FIFO.
  * Return `this` so it can be chained.

example:
  ```javascript
  import YAHF from 'yahf';

  const server = new YAHF()
  server.useMiddleware((data) => {
      server.logger(data);
  })
  ```

* `addHandler(path:string | string[], handler: (data) => RequestResult | ((data) => RequestResult)[])`.
  * If arrays are supplied, it is up to the caller to make sure that the order of both is as the caller expected.
  * Return `this` so it can be chained.
  * `RequestResult` is optional.

* `RequestResult`
  ```typescript
  {
      statusCode: number; // Defaults to 200
      contentType: string; // Defaults to 'application/json'
      payload: any;
  }
  ```

* `start()`
  * Will start the server, listening on the port was passed in.
  * Return `this` so it can be chained.

## Request lifecycle
* Every middleware/handler will get the following object:
  ```typescript
  {
    path: string;
    query: string; // Defaults to undefined
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'...;
    headers: object;
    payload: string; // Defaults to an empty string
  }
  ```
* Middlewares are called FIFO, and called before any handler.
* Handlers are called for exact match for the path, without starting `/`.
