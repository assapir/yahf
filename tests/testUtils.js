import YAHF from "../index.js";

export function getRandomPort() {
  return Math.floor(Math.random() * (2048 - 1338) + 1338);
}

export function createServer(port) {
  return new YAHF({
    port,
    logger: () => {},
  });
}

export async function requestYahf(
  method,
  path,
  port = 1337,
  body = "",
  contentType = "application/json"
) {
  const stringBody =
    typeof body === "string" || !body ? body : JSON.stringify(body);

  const headers = {
    "Content-Type": contentType,
    "Content-Length": Buffer.byteLength(stringBody ?? ""),
    "User-Agent": "YAHF/0.1.1",
  };

  return fetch(`http://localhost:${port}${path}`, {
    method,
    headers,
    body: stringBody ? stringBody : undefined,
  });
}
