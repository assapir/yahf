import YAHF from "../src/yahf.js";

const port = Number(process.env.PORT ?? 1338);

const server = new YAHF({ port }).addHandler({
  path: "headers",
  method: "GET",
  handler: async () => {
    return {
      statusCode: 200,
      payload: "ok",
      contentType: "text/plain",
      headers: new Headers({ "x-example": "hello" }),
    };
  },
});

server.start();
console.log(`Example headers server started on port ${port}`);
