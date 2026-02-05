"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../utils");
const logger_1 = require("../utils/logger");
const websocketBase_1 = require("./websocketBase");
const logger = (0, logger_1.getLogger)(__filename);
class WebSocketHandlerMiddleware {
    auxPromise;
    plugins;
    constructor(plugins) {
        this.plugins = plugins;
        this.auxPromise = this.createAuxPromise();
    }
    createAuxPromise = () => {
        return !this.plugins || this.plugins.length === 0
            ? Promise.resolve({}) // tslint:disable-line
            : Promise.all(this.plugins.map((plugin) => {
                const maybePromise = plugin.create();
                return maybePromise instanceof Promise
                    ? maybePromise
                    : Promise.resolve(maybePromise);
            })).then((auxes) => auxes.reduce((all, each) => ({ ...all, ...each }), {}));
    };
}
class WebSocketHandlerProxy {
    request;
    aux;
    result;
    constructor(event, context) {
        logger.stupid(`WebSocket event`, event);
        this.request = new websocketBase_1.WebSocketHandlerRequest(event, context);
        this.aux = {}; // tslint:disable-line
        this.result = { statusCode: 200 };
    }
    call = async (middleware, handler) => {
        try {
            this.aux = await middleware.auxPromise;
        }
        catch (error) {
            logger.error(`Error while initializing plugins' aux: ${(0, utils_1.stringifyError)(error)}`);
            return {
                statusCode: 500,
                body: JSON.stringify(error instanceof Error ? { error: error.message } : error),
            };
        }
        const actualHandler = [this.generateHandlerDelegator(handler)];
        const beginHandlers = middleware.plugins.map((plugin) => this.generatePluginDelegator(plugin.begin));
        const endHandlers = middleware.plugins.map((plugin) => this.generatePluginDelegator(plugin.end));
        const errorHandlers = middleware.plugins.map((plugin) => this.generatePluginDelegator(plugin.error));
        const iterate = async (handlers) => Promise.all(handlers.map((each) => this.safeCall(each, errorHandlers)));
        const results = [
            ...(await iterate(beginHandlers)),
            ...(await iterate(actualHandler)),
            ...(await iterate(endHandlers)),
        ].filter((x) => x);
        // In test phase, throws any exception if there was.
        if (process.env.NODE_ENV === 'test') {
            for (const each of results) {
                if (each instanceof Error) {
                    logger.error(`Error occurred: ${(0, utils_1.stringifyError)(each)}`);
                    throw each;
                }
            }
        }
        results.forEach((result) => logger.silly(`WebSocket middleware result: ${JSON.stringify(result)}`));
        return this.result;
    };
    safeCall = async (delegator, errorHandlers) => {
        try {
            const result = await delegator();
            return result;
        }
        catch (error) {
            const handled = await this.handleError(error, errorHandlers);
            return handled;
        }
    };
    generateHandlerDelegator = (handler) => async () => {
        const maybePromise = handler({
            request: this.request,
            response: undefined, // WebSocket doesn't use response
            aux: this.aux,
        });
        const result = maybePromise instanceof Promise ? await maybePromise : maybePromise;
        logger.stupid(`WebSocket handler result`, result);
        if (result) {
            this.result = result;
        }
        return result;
    };
    generatePluginDelegator = (pluginCallback) => async () => {
        const maybePromise = pluginCallback({
            request: this.request,
            response: undefined, // WebSocket doesn't use response (for HTTP plugin compatibility)
            aux: this.aux,
        });
        const result = maybePromise instanceof Promise ? await maybePromise : maybePromise;
        logger.stupid(`WebSocket plugin callback result`, result);
        return result;
    };
    handleError = async (error, errorHandlers) => {
        logger.error(error);
        this.request.lastError = error;
        if (errorHandlers) {
            for (const handler of errorHandlers) {
                try {
                    await handler();
                }
                catch (ignorable) {
                    logger.error(ignorable);
                }
            }
        }
        this.result = {
            statusCode: 500,
            body: JSON.stringify(error instanceof Error ? { error: error.message } : error),
        };
        return error;
    };
}
const buildWebSocket = (plugins) => {
    const middleware = new WebSocketHandlerMiddleware(plugins);
    return (handler) => async (event, context) => {
        return new WebSocketHandlerProxy(event, context).call(middleware, handler);
    };
};
exports.default = buildWebSocket;
