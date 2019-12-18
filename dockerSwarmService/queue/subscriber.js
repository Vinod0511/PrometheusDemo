"use strict";
const queue = require("./index");
const getErrorMessage = require("./getErrorMessage")

async function subscriber(readQueue, readQueuePreFetchLimit, config, cb) {
    var logger = console
    const queueObj = queue([
        readQueue
    ], logger, config, true)
    


    async function start(rQpfLimit) {
        try {
            var ee = await queueObj.getSubscriptionObj(readQueue, rQpfLimit)
            ee.on("message", async (msg) => {
                function done() {
                    queueObj.acknowledge(msg);
                }
                var message = null;
                try {
                    message = JSON.parse(msg.content.toString());
                } catch (e) {
                    logger.error(`Failed to parse the message into JSON. message ${msg && msg.content && msg.content.toString()}`)
                    queueObj.reject(msg)
                    return;
                }
                cb(message, done)
            })

        } catch (e) {
            logger.error(`Error occured. ${getErrorMessage(e)}`);
            process.exit(1);
        }
    }
    start(readQueuePreFetchLimit);
}

module.exports = subscriber;