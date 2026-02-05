"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLogger = exports.Logger = exports.currentLogLevel = exports.LogLevel = void 0;
const path_1 = require("path");
const simple_staging_1 = require("simple-staging");
const ts_enum_util_1 = require("ts-enum-util");
const misc_1 = require("./misc");
var LogLevel;
(function (LogLevel) {
    LogLevel["Error"] = "error";
    LogLevel["Warn"] = "warn";
    LogLevel["Info"] = "info";
    LogLevel["Debug"] = "debug";
    LogLevel["Verbose"] = "verbose";
    LogLevel["Silly"] = "silly";
    LogLevel["Stupid"] = "stupid";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
const severity = (level) => {
    switch (level) {
        case LogLevel.Error:
            return 100;
        case LogLevel.Warn:
            return 200;
        case LogLevel.Info:
            return 300;
        case LogLevel.Debug:
            return 400;
        case LogLevel.Verbose:
            return 500;
        case LogLevel.Silly:
            return 600;
        case LogLevel.Stupid:
            return 700;
        default:
            return 1000;
    }
};
exports.currentLogLevel = (0, ts_enum_util_1.$enum)(LogLevel).asValueOrDefault(process.env.LOG_LEVEL, simple_staging_1.envDefault.level !== simple_staging_1.StagingLevel.Release
    ? LogLevel.Verbose
    : LogLevel.Debug);
class Logger {
    name;
    severity;
    constructor(name, level = exports.currentLogLevel) {
        this.name = name;
        this.severity = severity(level);
    }
    log = (level, message) => {
        if (this.severity >= severity(level)) {
            console.log(`[${new Date().toISOString()}][${level.toUpperCase()}][${this.name}] ${message instanceof Error ? (0, misc_1.stringifyError)(message) : message}`);
        }
        return message;
    };
    error = (message) => this.log(LogLevel.Error, message);
    warn = (message) => this.log(LogLevel.Warn, message);
    info = (message) => this.log(LogLevel.Info, message);
    debug = (message) => this.log(LogLevel.Debug, message);
    verbose = (message) => this.log(LogLevel.Verbose, message);
    silly = (message) => this.log(LogLevel.Silly, message);
    stupid = (message, object, replacer) => {
        this.log(LogLevel.Stupid, `${message}: ${JSON.stringify(object, replacer)}`);
        return object;
    };
}
exports.Logger = Logger;
const loggers = {};
const getLogger = (fileName, level) => {
    const name = (0, path_1.basename)(fileName);
    if (loggers[name] === undefined) {
        loggers[name] = new Logger(name, level);
    }
    return loggers[name];
};
exports.getLogger = getLogger;
