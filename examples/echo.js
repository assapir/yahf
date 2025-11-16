import YAHF from "../src/yahf.js";

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
