import { assert } from 'console';
import { request } from 'http';
import { strict } from 'assert';

import YAHF from '../index.js';

function requestYahf(method, path, body = '') {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 1337,
            method,
            path,
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body)
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
    const res = await requestYahf('GET', '/api');
    await server.kill()

    strict.equal(res.statusCode, 404, `status code suppose to be 404, but was ${res.statusCode}`);
    strict.equal(res.headers['content-type'], 'application/json', `content-type suppose to be JSON, but it ${res.headers[`content-type`]}`);
}

async function run() {
    const testPromises = [
        handlesGETWithDefaults
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