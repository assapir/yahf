import YAHF from '../index.js';

const yahf = new YAHF().useMiddleware(data => {
  console.log(data);
})
await yahf.start();
