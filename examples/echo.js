import YAHF from "../src/yahf.js";

const port = Number(process.env.PORT ?? 1337);
const server = new YAHF({ port }).addHandler({
  path: "echo",
  method: "POST",
  handler: async (data) => {
    return {
      payload: data.payload,
    };
  },
});

server.start();
console.log(`Example echo server started on port ${port}`);
