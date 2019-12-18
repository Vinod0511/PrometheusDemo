'use strict';

function getErrorMessage(e) {
    let message;
    if (!e) {
        message = ""
    }
    else if (e instanceof Error) {
        if (e.isAxiosError) {
            message = `Message: ${e.message}. url ${e.config.url} type ${e.config.type}`
        } else {
            message = `Message: ${e.message} stack: ${e.stack}`
        }
    } else if (typeof e === "string") {
        message = e
    } else {
        message = `Message: ${e.message || JSON.stringify(e)}`
    }
    return message;
}

module.exports = getErrorMessage