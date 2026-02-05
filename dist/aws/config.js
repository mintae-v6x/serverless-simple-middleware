"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadAWSConfig = exports.SimpleAWSConfig = void 0;
const cross_fetch_1 = require("cross-fetch");
const fs = require("fs");
class SimpleAWSConfig {
    configs;
    constructor(configs) {
        this.configs = configs;
    }
    get = (service) => {
        return this.configs ? this.configs[service] : undefined;
    };
}
exports.SimpleAWSConfig = SimpleAWSConfig;
const loadAWSConfig = (newConfigsOrUrl) => {
    if (typeof newConfigsOrUrl === 'string') {
        if (/^http.*json$/.test(newConfigsOrUrl)) {
            return (0, cross_fetch_1.default)(newConfigsOrUrl)
                .then((r) => r.json())
                .then(exports.loadAWSConfig);
        }
        else if (/json$/.test(newConfigsOrUrl)) {
            return (0, exports.loadAWSConfig)(JSON.parse(fs.readFileSync(newConfigsOrUrl, 'utf-8')));
        }
        return (0, exports.loadAWSConfig)(JSON.parse(newConfigsOrUrl));
    }
    return Promise.resolve(new SimpleAWSConfig(newConfigsOrUrl));
};
exports.loadAWSConfig = loadAWSConfig;
