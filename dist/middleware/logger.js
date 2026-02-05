"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoggerPlugin = void 0;
const utils_1 = require("../utils");
const base_1 = require("./base");
class LoggerPlugin extends base_1.HandlerPluginBase {
    options;
    constructor(options) {
        super();
        this.options = options;
    }
    create = async () => {
        const { name, level } = this.options;
        return { logger: (0, utils_1.getLogger)(name, level) };
    };
}
exports.LoggerPlugin = LoggerPlugin;
const build = (options) => new LoggerPlugin(options);
exports.default = build;
