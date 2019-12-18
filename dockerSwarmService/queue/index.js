"use strict";
const amqp = require('amqplib');
const EventEmitter = require('events');
const axios = require("axios")
const getErrorMessage = require("./getErrorMessage")
// terminateProcessOnConnectionError is used to raise an event for connection errors 
// rather than terminate. Useful in certain cases, like scanAssets

function init(queues, logger, queueConfig, terminateProcessOnConnectionError) {
    const commonPreFetchLimit = queueConfig.preFetchLimit
    var rabbitUserName = queueConfig.userName
    var rabbitpassword = queueConfig.password

    var connectionString = `amqp://${rabbitUserName}:${rabbitpassword}@${queueConfig.hostname}:${queueConfig.port}/${queueConfig.vhost}`
    var publishUrl = `http://${queueConfig.hostname}:${queueConfig.adminPort}/api/exchanges/${queueConfig.vhost}/amq.default/publish`
    var channel = null, connection = null, queueNameConsumerTagMap = {};
    queues = queues || [];    
    connect();

    function getPublishObj(queueName, message, priority) {
        if (!priority || !Number.isInteger(priority)) {
            priority = 1
        }
        var obj = {
            "vhost": queueConfig.vhost,
            "name": "amq.default",
            "properties": { "delivery_mode": 2, "headers": {}, "priority": priority },
            "routing_key": queueName, "delivery_mode": "2", "payload": message, "headers": {},
            "props": { "priority": priority.toString() }, "payload_encoding": "string"
        }
        return obj
    }

    function waitUntilReady() {
        const maxAttempt = 5, timeToWaitInMs = 2000
        const RABBIT_MQ_RETRY_EXCEEDED = "RabbitMq : Max attempts for connection retry reached"


        function _waitUntilReadySubscriberRecurseCb(attempt, cb) {
            if (attempt === maxAttempt) {
                cb(RABBIT_MQ_RETRY_EXCEEDED)
            } else if (channel) {
                cb(null)
            } else {
                setTimeout(() => {
                    _waitUntilReadySubscriberRecurseCb(++attempt, cb)
                }, timeToWaitInMs);
            }
        }
        return new Promise((resolve, reject) => {
            var callback = (err) => {
                if (err) {
                    logger.error(`Error ${err}`);
                    if (terminateProcessOnConnectionError) {
                        process.exit(1)
                    } else {
                        obj.errorEvent.emit("error")
                        reject(err)
                    }
                } else {
                    resolve();
                }
            }
            _waitUntilReadySubscriberRecurseCb(0, callback)

        })

    }

    function handleConnectionErrors(err) {
        var msg = getErrorMessage(err);
        logger.error(`Error occured in connection ${msg}`)
        if (terminateProcessOnConnectionError) {
            process.exit(1)
        } else {
            obj.errorEvent.emit("error")
        }
    }

    function connect() {
        amqp.connect(connectionString).then(function (conn) {
            connection = conn;
            connection.on('error', (err) => {
                handleConnectionErrors(err)
            })
            connection.on('close', () => {
                handleConnectionErrors()
            })
            return conn.createChannel()

        }).then(function (ch) {
            channel = ch;
            channel.on('error', (err) => {
                var msg = getErrorMessage(err);
                logger.error(`Error occured in channel ${msg}`)
                if (terminateProcessOnConnectionError) {
                    process.exit(1)
                } else {
                    obj.errorEvent.emit("error")
                }
            })
            channel.on('close', () => {
                handleConnectionErrors()
            })
            return Promise.all(queues.map(
                (queue) => channel.checkQueue(queue))
            )
        }).catch((err) => {
            var msg = getErrorMessage(err);
            logger.error(`Failed to connect to messaging queue. Error ${msg}.`);
            if (terminateProcessOnConnectionError) {
                logger.error("Exiting")
                process.exit(1)
            } else {
                obj.errorEvent.emit("error")
            }
        })
    }
    var obj = {
        errorEvent: new EventEmitter(),
        publishToQueue: function (queueName, message, priority) {
            var msg;
            if (!message) {
                return Promise.reject("No message sent to publish")
            }
            if (typeof (message) === "object") {
                msg = JSON.stringify(message)
            } else {
                msg = message;
            }
            var obj = getPublishObj(queueName, msg, priority)
            return axios.request({
                url: publishUrl,
                method: 'post',
                timeout: 90000,
                auth: {
                    username: rabbitUserName,
                    password: rabbitpassword
                },
                maxContentLength: 1000 * 1024 * 1024,
                data: obj
            }).then((resp) => resp.data)
        },
        /*
        Sample messagePriorityObjs: [{
            message: {

            },
            priority: 1
        }]
        priority is a number from 1-3.
        falsey value if priority is not to be set
        */
        getSubscriptionObj: function (queueName, preFetchLimit) {
            return waitUntilReady().then(() => {
                const myEmitter = new EventEmitter();
                preFetchLimit = preFetchLimit || commonPreFetchLimit
                channel.prefetch(preFetchLimit)
                channel.consume(queueName, function (msg) {
                    queueNameConsumerTagMap[queueName] = msg.fields.consumerTag;
                    myEmitter.emit("message", msg)
                });
                return myEmitter;
            })
            // .then((msg) => {
            //     console.log(" [x] Received '%s'", msg.content.toString());
            // })
        },
        cancelSubscription: function (queueName) {
            if (channel && queueNameConsumerTagMap[queueName]) {
                return new Promise((resolve) => {
                    channel.cancel(queueNameConsumerTagMap[queueName], (err) => {
                        if (err) {
                            logger.error(`Error occured while cancelling subscription ${(err.message || err)}`)
                        }
                        resolve();
                    })
                })
            } else {
                return Promise.resolve()
            }
        },
        acknowledge: function (msg) {
            channel.ack(msg)
        },
        acknowledgeAll: function () {
            channel.ackAll();
        },
        reject: function (msg) {
            channel.nack(msg, false, false);
        }
    }
    return obj;

}

module.exports = init