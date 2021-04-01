let t;
import('./index.js').then(m => {
    console.log(m.default)
    t = m.default
});

console.log(t)
