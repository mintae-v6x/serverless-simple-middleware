"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AWSPlugin = void 0;
const aws_1 = require("../aws");
const utils_1 = require("../utils");
const base_1 = require("./base");
const logger = (0, utils_1.getLogger)(__filename);
const initialize = async (aws, mapper) => {
    const env = process.env;
    const mapping = mapper(aws, env);
    const successes = await Promise.all(Object.keys(mapping).map((name) => mapping[name]()));
    return Object.keys(mapping).reduce((result, name, index) => ({ ...result, [name]: successes[index] }), {});
};
class AWSPlugin extends base_1.HandlerPluginBase {
    options;
    aws;
    config;
    constructor(options) {
        super();
        this.options = options;
        this.config = new aws_1.SimpleAWSConfig();
    }
    create = async () => {
        // Setup only once.
        if (!this.aws) {
            const { config, mapper } = this.options || {
                config: undefined,
                mapper: undefined,
            };
            if (config) {
                logger.debug(`Load aws config from ${config}`);
                this.config = await (0, aws_1.loadAWSConfig)(config);
            }
            this.aws = new aws_1.SimpleAWS(this.config);
            if (mapper) {
                logger.debug(`Initialize aws components with mapper.`);
                await initialize(this.aws, mapper);
            }
        }
        return {
            aws: this.aws,
            awsConfig: this.config,
        };
    };
}
exports.AWSPlugin = AWSPlugin;
const build = (options) => new AWSPlugin(options);
exports.default = build;
