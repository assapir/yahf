import { request } from "http";

export function getRandomPort() {
  return Math.floor(Math.random() * (2048 - 1338) + 1338);
}

export function requestYahf(method, path, port = 1337, body = "") {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "localhost",
      port,
      method,
      path,
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
        "User-Agent": "YAHF/0.1.1",
      },
    };

    const req = request(options, (res) => {
      res.setEncoding("utf8");
      let resBody = "";
      res.on("data", (chunk) => {
        resBody += chunk;
      });
      res.on("error", reject);
      res.on("end", () => {
        resolve({
          body: resBody,
          statusCode: res.statusCode,
          headers: res.headers,
        });
      });
    });

    if (body.length) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}
