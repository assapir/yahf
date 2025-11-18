#!/usr/bin/env node

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { setTimeout } from "node:timers/promises";

const examplesDir = path.resolve(new URL(import.meta.url).pathname, "..");
const files = fs
  .readdirSync(examplesDir)
  .filter((f) => f.endsWith(".js") && f !== "runExamples.js");

const START_PORT = Number(process.env.START_PORT ?? 1338);

const processes = [];

async function waitForServer(port, route = "/", timeout = 1000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(`http://localhost:${port}${route}`, {
        method: "GET",
      });
      if (res) return true;
    } catch (err) {
      // ignore, server not up yet
    }
    await setTimeout(500);
  }
  return false;
}

async function run() {
  if (!files.length) {
    console.log("No examples found");
    return;
  }

  let i = 0;
  for (const file of files) {
    const port = START_PORT + i;
    const fpath = path.join(examplesDir, file);
    console.log(`Starting ${file} on port ${port}...`);
    const child = spawn("node", [fpath], {
      env: { ...process.env, PORT: `${port}` },
      stdio: ["ignore", "pipe", "pipe"],
    });

    child.stdout.on("data", (d) => process.stdout.write(`[${file}] ${d}`));
    child.stderr.on("data", (d) => process.stderr.write(`[${file}] ${d}`));

    processes.push(child);
    i++;
  }

  try {
    // Inspect each example file to discover the route path and method
    for (let j = 0; j < files.length; j++) {
      const file = files[j];
      const content = fs.readFileSync(path.join(examplesDir, file), "utf8");
      const pathMatch = content.match(/path:\s*["']([^"']+)["']/);
      const methodMatch = content.match(/method:\s*["']([^"']+)["']/i);
      const route = pathMatch ? `/${pathMatch[1]}` : "/";
      const method = methodMatch ? methodMatch[1].toUpperCase() : "GET";
      const port = START_PORT + j;
      console.log(`Validating ${file} (${method} ${route}) at port ${port}`);

      // wait for the server to respond on its main route
      const up = await waitForServer(port, route);
      if (!up) throw new Error(`${file} ${route} did not respond in time`);

      if (method === "POST") {
        const res = await fetch(`http://localhost:${port}${route}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hello: "ci" }),
        });
        if (!res.ok) throw new Error(`${file} ${route} returned ${res.status}`);
      } else {
        const res = await fetch(`http://localhost:${port}${route}`, {
          method: "GET",
        });
        if (!res) throw new Error(`${file} ${route} did not respond`);
        // If the example exposes a /headers endpoint, check for header presence
        if (route.toLowerCase().includes("headers")) {
          const headerValue = res.headers.get("x-example");
          if (!headerValue)
            throw new Error(`${file} ${route} missed x-example header`);
        }
      }
    }
    // Completed checks – exit normally

    console.log("All examples started successfully.");
  } catch (err) {
    console.error("Error starting examples:", err.message);
    process.exitCode = 1;
  } finally {
    // kill children
    for (const p of processes) p.kill();
  }
}

run();
