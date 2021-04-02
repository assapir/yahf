
import { request } from 'http';
import * as tests from './yahf.test.js'

export function getRandomPort() {
    return Math.floor(Math.random() * (2048 - 1338) + 1338);
}

export function requestYahf(method, path, port = 1337, body = '') {
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
async function run() {
    const testPromises = Object.keys(tests).map(testName => tests[testName]);
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
