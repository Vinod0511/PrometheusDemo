const express = require("express")
const app = express();
const isNullOrEmpty = require('is-null-or-empty')
const client = require('prom-client');
const { contentCounter, responseCounter } = require("./metrics")
const logger = console;
const port = 5010
app.get("/status/:statusCode", async (request, response) => {
    let statusCode = Number(request.params.statusCode);
    if (Number.isNaN(statusCode)) {
        statusCode = 500;
    }
    let content = request.query.content
    if (!isNullOrEmpty(content)) {
        contentCounter.inc()
    }
    response.status(statusCode).send(content);
    responseCounter.inc({"status_code": statusCode})
})

app.get("/metrics", (request, response) => {
    response.set("Content-Type", client.register.contentType);
    response.send(client.register.metrics());
});

app.listen(port, err => {
    if (err) {
        return logger.error(`something bad happened ${err}`);
    }
    logger.info(`Server is listening on ${port}`);
});
