const client = require('prom-client');

const contentCounter = new client.Counter({
    name: 'request_with_content',
    help: 'Total Number of requests having content'
});

const responseCounter =  new client.Counter({
    name: 'response_total',
    help: 'Total Number of response sent',
    labelNames: ['status_code'],
})

module.exports = {
    contentCounter,
    responseCounter
}

