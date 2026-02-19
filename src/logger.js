const fs = require('fs');
const path = require('path');

const logFilePath = path.join(__dirname, 'logs.json');

const levels = {
    ERROR: 'ERROR',
    WARN: 'WARN',
    INFO: 'INFO',
    DEBUG: 'DEBUG'
};

function getTimestamp() {
    return new Date().toISOString();
}

function log(level, message, context = {}) {
    const logEntry = {
        level,
        message,
        timestamp: getTimestamp(),
        context
    };

    fs.appendFileSync(logFilePath, JSON.stringify(logEntry) + '\n');
}

module.exports = {
    error: (message, context) => log(levels.ERROR, message, context),
    warn: (message, context) => log(levels.WARN, message, context),
    info: (message, context) => log(levels.INFO, message, context),
    debug: (message, context) => log(levels.DEBUG, message, context)
};
