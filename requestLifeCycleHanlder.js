// import string decoder module
import { StringDecoder } from 'string_decoder';

const YAHF = {}

// create empty middlewares array
const middlewares = [];

// create empty routes object
const routes = {};

YAHF.useMiddleware = middleware => {
  middlewares.push(middleware);
}

YAHF.useRoute = (path, handler) => {
    routes[path] = handler;
}

YAHF.requestInit = (req, res) => {
    return new Promise((resolve, reject) => {
        // get the url and parse it
        const parsedUrl = new URL(req.url, 'http://localhost:3000');
        // get the path so we can get the route, remove the leading '/' and empty string
        const path = parsedUrl.pathname.split('/').filter(Boolean);
        // get the query string as an object
        const query = parsedUrl.query;
        // get the method
        const method = req.method;
        // get the headers as an object
        const headers = req.headers;
        // get the payload if any
        const decoder = new StringDecoder('utf-8');
        let buffer = '';
        req.on('data', (data) => {
            buffer += decoder.write(data);
        });

        req.on('end', () => {
            buffer += decoder.end();
            const data = {
                path,
                query,
                method,
                headers,
                payload: buffer
            };

            resolve(data);
        });

        req.on('error', (err) => {
            reject(err);
        });
    });
}

YAHF.serverHandler = async (req, res) => {
    try {
        const data = await requestInit(req, res);
        for (const middleware of middlewares) {
            await middleware(data);
        }

        const handler = routes[data.path];
        if (!handler) {
            res.statusCode = 404;
            res.end();
            return;
        }
        // handle the request
        const handlerResult = await handler(data);
        // send the response
        res.statusCode = handlerResult.statusCode || 200;
        res.setHeader('Content-Type', handlerResult.contentType || 'text/html');
        res.end(handlerResult.payload);
    } catch (err) {
        res.statusCode = 500;
        res.end(err.message);
    }
}

export default YAHF;
