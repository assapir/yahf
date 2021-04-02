import { strict } from 'assert';

import YAHF from '../index.js';
import { getRandomPort, requestYahf } from './testRunner.js';

export async function handlesGETWithDefaults() {
    const server = new YAHF();
    await server.start();
    const res = await requestYahf('GET', '');
    await server.kill()

    strict.equal(res.statusCode, 404, `status code suppose to be 404, but was ${res.statusCode}`);
    strict.equal(res.headers['content-type'], 'application/json', `content-type suppose to be JSON, but it ${res.headers[`content-type`]}`);
}

export async function handlesPOSTWithMiddlewareAndController() {
    const port = getRandomPort()
    const server = new YAHF({
        port
    }).useMiddleware(data => {
        data.payload = `${data.headers['user-agent']} and ${data.method}`;
    }).addHandler({
        path: 'echo',
        method: 'POST',
        handler: async data => {
            return {
                statusCode: 201,
                payload: data.payload,
                contentType: 'text/plain',
                headers: {
                    'oh-no': 'this is a test'
                }
            }
        }
    });
    await server.start();
    const res = await requestYahf('POST', '/echo', port);
    await server.kill()

    strict.equal(res.statusCode, 201, `status code suppose to be 201, but was ${res.statusCode}`);
    strict.equal(res.headers['content-type'], 'text/plain', `content-type suppose to be text/plain, but it ${res.headers[`content-type`]}`);
    strict.equal(res.body, 'YAHF/0.1.1 and POST', `body should have been YAHF/0.1.1, but it was ${res.body}`);
    strict.equal(res.headers['oh-no'], 'this is a test', `headers should have been set to {'oh-no':'this is a test'}`);
}

export async function returns404ForDifferentMethods() {
    const port = getRandomPort()
    const server = new YAHF({
        port
    }).addHandler({
        path: 'echo',
        method: 'POST',
        handler: async data => {
            return {
                statusCode: 201,
                payload: data.payload,
                contentType: 'text/plain',
                headers: {
                    'oh-no': 'this is a test'
                }
            }
        }
    });
    await server.start();
    const res = await requestYahf('GET', '/echo', port);
    await server.kill()

    strict.equal(res.statusCode, 404, `status code suppose to be 404, but was ${res.statusCode}`);
    strict.equal(res.headers['content-type'], 'application/json', `content-type suppose to be JSON, but it ${res.headers[`content-type`]}`);
}
