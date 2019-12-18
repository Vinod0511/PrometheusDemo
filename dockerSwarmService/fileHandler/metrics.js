"use strict";
const client = require('prom-client');

const successCounter = new client.Counter({
    name: 'successful_counter',
    help: 'Total Number of operations completed successfully'
});

const failedCounter = new client.Counter({
    name: 'failed_counter',
    help: 'Total Number of operations failed'
});
module.exports = {
    successCounter,
    failedCounter
}