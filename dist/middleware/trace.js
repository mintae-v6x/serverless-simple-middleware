"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TracerPlugin = exports.TracerWrapper = exports.Tracer = exports.TracerLog = void 0;
const uuid_1 = require("uuid");
const aws_1 = require("../aws");
const utils_1 = require("../utils");
const client_sqs_1 = require("@aws-sdk/client-sqs");
const ts_enum_util_1 = require("ts-enum-util");
const base_1 = require("./base");
const logger = (0, utils_1.getLogger)(__filename);
class TracerLog {
    route;
    key;
    system;
    action;
    attribute;
    body;
    error;
    client;
    version;
    uuid;
    timestamp;
    constructor(route, key, system, action, attribute, body, error, client, version) {
        this.route = route;
        this.key = key;
        this.system = system;
        this.action = action;
        this.attribute = attribute;
        this.body = body;
        this.error = error;
        this.client = client;
        this.version = version;
        this.uuid = (0, uuid_1.v4)();
        this.timestamp = Date.now();
    }
}
exports.TracerLog = TracerLog;
class Tracer {
    queueName;
    sqs;
    buffer;
    constructor(queueName, sqs) {
        this.queueName = queueName;
        this.sqs = sqs;
        this.buffer = [];
    }
    push = (log) => this.buffer.push(log);
    flush = async () => {
        if (this.buffer.length === 0) {
            return;
        }
        try {
            const urlResult = await this.sqs.getQueueUrl({
                QueueName: this.queueName,
            });
            logger.stupid(`urlResult`, urlResult);
            if (!urlResult.QueueUrl) {
                throw new Error(`No queue url with name[${this.queueName}]`);
            }
            const eventQueueUrl = urlResult.QueueUrl;
            const chunkSize = 10;
            for (let begin = 0; begin < this.buffer.length; begin += chunkSize) {
                const end = Math.min(this.buffer.length, begin + chunkSize);
                const subset = this.buffer.slice(begin, end);
                const sendBatchResult = await this.sqs.sendMessageBatch({
                    QueueUrl: eventQueueUrl,
                    Entries: subset.map((each) => ({
                        Id: `${each.key}_${each.uuid}`,
                        MessageBody: JSON.stringify(each),
                    })),
                });
                logger.stupid(`sendBatchResult`, sendBatchResult);
            }
            this.buffer = [];
        }
        catch (error) {
            logger.warn(`Error in eventSource: ${error}`);
        }
    };
}
exports.Tracer = Tracer;
class TracerWrapper {
    tracer;
    route;
    system;
    key;
    action;
    client;
    version;
    constructor(tracer, route, system, key, action, client, version) {
        this.tracer = tracer;
        this.route = route;
        this.system = system;
        this.key = key;
        this.action = action;
        this.client = client;
        this.version = version;
    }
    push = (attribute, body, error = false) => {
        this.tracer.push(new TracerLog(this.route, this.key, this.system, this.action, attribute, body, error, this.client, this.version));
    };
    send = (log) => {
        this.tracer.push(new TracerLog(log.route || this.route, log.key || this.key, log.system || this.system, log.action || this.action, log.attribute, log.body, log.error || false, log.client || this.client, log.version || this.version));
    };
}
exports.TracerWrapper = TracerWrapper;
class TracerPlugin extends base_1.HandlerPluginBase {
    tracer;
    options;
    last;
    client;
    constructor(options) {
        super();
        this.options = options;
        this.last = {
            key: 'nothing',
            action: 'unknown',
        };
        this.client = {
            agent: '',
            version: '',
        };
    }
    create = async () => {
        const awsConfig = this.options.awsConfig
            ? await (0, aws_1.loadAWSConfig)(this.options.awsConfig)
            : undefined;
        const sqs = (() => {
            if (!awsConfig) {
                return new client_sqs_1.SQS({
                    region: this.options.region,
                });
            }
            (0, ts_enum_util_1.$enum)(aws_1.AWSComponent).forEach((eachComponent) => {
                const config = awsConfig.get(eachComponent);
                if (config) {
                    config.region = this.options.region;
                }
            });
            return new aws_1.SimpleAWS(awsConfig).sqs;
        })();
        this.tracer = new Tracer(this.options.queueName, sqs);
        const tracer = (key, action) => {
            this.last = { key, action };
            return new TracerWrapper(this.tracer, this.options.route, this.options.system, key, action, this.client.agent, this.client.version);
        };
        return { tracer };
    };
    begin = ({ request }) => {
        this.client.version = request.header('X-Version') || '0.0.0';
        this.client.agent = (() => {
            const fromHeader = request.header('User-Agent');
            if (fromHeader) {
                return fromHeader;
            }
            if (request.context &&
                request.context.identity &&
                request.context.identity.userAgent) {
                return request.context.identity.userAgent;
            }
            return '';
        })();
    };
    end = () => this.tracer.flush();
    error = ({ request, aux }) => {
        if (!aux) {
            console.warn('Aux is not initialized');
            return;
        }
        if (!request.lastError) {
            return;
        }
        const { key, action } = this.last;
        aux
            .tracer(key, action)
            .push('error', typeof request.lastError === 'string'
            ? request.lastError
            : (0, utils_1.stringifyError)(request.lastError), true);
    };
}
exports.TracerPlugin = TracerPlugin;
const build = (options) => new TracerPlugin(options);
exports.default = build;
