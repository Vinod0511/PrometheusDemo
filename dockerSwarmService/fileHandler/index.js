"use strict";
const subscriber = require("../queue/subscriber")
const yenv = require('yenv')
const config = yenv("./fileHandler.yml", { env: 'default' });
const metrics = require("./metrics")
const path = require("path")
const express = require("express");
const app = express();
const client = require('prom-client');
const promBundle = require("express-prom-bundle");
const metricsMiddleware = promBundle({includeMethod: true});
app.use(metricsMiddleware);

function initializeMetricsServer(port) {

    const logger = console
    //define route for prometheus metrics;
    app.get("/metrics", (request, response) => {
        response.set("Content-Type", client.register.contentType);
        response.send(client.register.metrics());
    });

    app.listen(port, err => {
        if (err) {
            return logger.error(`something bad happened ${err}`);
        }
        logger.info(`Prometheus metrics server is listening on ${port}`);
    });
}
async function start() {
    var logger = console
    subscriber("fileHandlerRead", null, config, async (message, done) => {
        try {
            let filename = message.filename
            let extn = path.extname(filename).toLowerCase()
            let validExtns = {
                ".jpg": true,
                ".txt": true
            }
            if (!validExtns[extn]) {
                throw "Invalid extn"
            }
            logger.log("Valid extension. Processed")
            metrics.successCounter.inc();
        } catch (e) {
            logger.error(`Error occured. ${e}`);
            metrics.failedCounter.inc();
        }
        finally {
            done()
        }

    })
}
initializeMetricsServer(3401)
start();