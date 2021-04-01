import { assert } from 'console';
import { request } from 'http';
import { strict } from 'assert';

import YAHF from '../index.js';

function getRandomPort() {
    return Math.floor(Math.random() * (2048 - 1338) + 1338);
}

function requestYahf(method, path, port = 1337, body = '') {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port,
            method,
            path,
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body),
                'User-Agent': 'YAHF/0.1.1',
            }
        }

        const req = request(options, res => {
            res.setEncoding('utf8');
            let resBody = '';
            res.on('data', (chunk) => {
                resBody += chunk;
            });
            res.on('error', reject)
            res.on('end', () => {
                resolve({
                    body: resBody,
                    statusCode: res.statusCode,
                    headers: res.headers
                });
            })
        })

        if (body.length) {
            req.write(JSON.stringify(body));
        }
        req.end();
    })
}

async function handlesGETWithDefaults() {
    const server = new YAHF();
    await server.start();
    const res = await requestYahf('GET', '');
    await server.kill()

    strict.equal(res.statusCode, 404, `status code suppose to be 404, but was ${res.statusCode}`);
    strict.equal(res.headers['content-type'], 'application/json', `content-type suppose to be JSON, but it ${res.headers[`content-type`]}`);
}

async function handlesPOSTWithMiddlewareAndController() {
    const port = getRandomPort()
    const server = new YAHF({
        port
    }).useMiddleware(data => {
        data.payload = `${data.headers['user-agent']} and ${data.method}`;
    }).addHandler(['echo'], [async data => {
        return {
            statusCode: 201,
            payload: data.payload,
            contentType: 'text/plain',
            headers: {
                'oh-no': 'this is a test'
            }
        }
    }]);
    await server.start();
    const res = await requestYahf('POST', '/echo', port);
    await server.kill()

    strict.equal(res.statusCode, 201, `status code suppose to be 201, but was ${res.statusCode}`);
    strict.equal(res.headers['content-type'], 'text/plain', `content-type suppose to be text/plain, but it ${res.headers[`content-type`]}`);
    strict.equal(res.body, 'YAHF/0.1.1 and POST', `body should have been YAHF/0.1.1, but it was ${res.body}`);
    strict.equal(res.headers['oh-no'], 'this is a test', `headers should have been set to {'oh-no':'this is a test'}`);
}

async function run() {
    const testPromises = [
        handlesGETWithDefaults,
        handlesPOSTWithMiddlewareAndController
    ];
    const testNames = testPromises.map(testPromise => testPromise.name);
    const results = await Promise.allSettled(testPromises.map(testPromise => testPromise.call()));
    const resultsStrings = results.map((result, idx) => {
        const testName = testNames[idx];
        return result.status === 'rejected' ?
            [`Test ${testName} Failed! - ${result.reason.message}`, false] :
            [`Test ${testName} Passed!`, true];
    });
    if (resultsStrings.some(result => result[1] === false)) {
        console.log(resultsStrings.filter(result => result[1] === false).map(result => result[0]));
        process.exit(1);
    } else {
        console.log(resultsStrings.filter(result => result[1] === true).map(result => result[0]));
        process.exit(0);
    }
}

await run()
