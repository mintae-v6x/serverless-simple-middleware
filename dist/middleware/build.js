"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = require("../utils/logger");
const zod_1 = require("zod");
const utils_1 = require("../utils");
const base_1 = require("./base");
const logger = (0, logger_1.getLogger)(__filename);
class HandlerMiddleware {
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
class HandlerProxy {
    request;
    response;
    aux;
    constructor(event, context, callback) {
        logger.stupid(`event`, event);
        this.request = new base_1.HandlerRequest(event, context);
        this.response = new base_1.HandlerResponse(callback);
        this.aux = {}; // tslint:disable-line
    }
    call = async (middleware, handler) => {
        try {
            this.aux = await middleware.auxPromise;
        }
        catch (error) {
            logger.error(`Error while initializing plugins' aux: ${(0, utils_1.stringifyError)(error)}`);
            this.response.fail(error instanceof Error ? { error: error.message } : error);
            return [error];
        }
        const actualHandler = [this.generateDelegator(handler)];
        const beginHandlers = middleware.plugins.map((plugin) => this.generateDelegator(plugin.begin));
        const endHandlers = middleware.plugins.map((plugin) => this.generateDelegator(plugin.end));
        const errorHandlers = middleware.plugins.map((plugin) => this.generateDelegator(plugin.error));
        const iterate = async (handlers, okResponsible = false) => Promise.all(handlers.map((each) => this.safeCall(each, okResponsible, errorHandlers)));
        const results = [
            ...(await iterate(beginHandlers)),
            ...(await iterate(actualHandler, true)),
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
        results.forEach((result) => logger.silly(`middleware result : ${JSON.stringify(result)}`));
    };
    safeCall = async (delegator, okResponsible, errorHandlers) => {
        try {
            const result = await delegator(okResponsible);
            return result;
        }
        catch (error) {
            const handled = await this.handleError(error, errorHandlers);
            return handled;
        }
    };
    generateDelegator = (handler) => async (okResponsible) => {
        const maybePromise = handler({
            request: this.request,
            response: this.response,
            aux: this.aux,
        });
        const result = maybePromise instanceof Promise ? await maybePromise : maybePromise;
        logger.stupid(`result`, result);
        if (!this.response.completed && okResponsible) {
            this.response.ok(result);
        }
        return result;
    };
    handleError = async (error, errorHandlers) => {
        logger.error(error);
        this.request.lastError = error;
        if (errorHandlers) {
            for (const handler of errorHandlers) {
                try {
                    await handler(false);
                }
                catch (ignorable) {
                    logger.error(ignorable);
                }
            }
        }
        if (!this.response.completed) {
            this.response.fail(error instanceof Error ? { error: error.message } : error);
        }
        return error;
    };
}
// It will break type safety because there is no relation between Aux and Plugin.
const build = (plugins) => {
    const middleware = new HandlerMiddleware(plugins);
    const invoke = (handler) => (event, context, callback) => {
        new HandlerProxy(event, context, callback).call(middleware, handler);
    };
    /**
     * @param schema - Zod schema to validate the request body.
     * @param handler - Handler that receives the validated body.
     * @param onInvalid - Optional callback to customize invalid responses. If it
     *   returns `{ statusCode, body }`, that is sent instead of the default zod
     *   error payload.
     */
    const withBody = (schema, handler, onInvalid) => invoke(async ({ request, response, aux }) => {
        const parsed = schema.safeParse(request.body);
        if (!parsed.success) {
            logger.error(`Validation failed: ${(0, utils_1.stringifyError)((0, zod_1.treeifyError)(parsed.error))}`);
            if (onInvalid) {
                const result = await onInvalid(parsed.error);
                if (result) {
                    return response.fail(result.body, result.statusCode);
                }
            }
            return response.fail((0, zod_1.treeifyError)(parsed.error), 400);
        }
        const typedRequest = request;
        typedRequest.body = parsed.data;
        return handler({
            request: typedRequest,
            response,
            aux,
        });
    });
    /**
     * @param schema - Zod schema to validate the request query.
     * @param handler - Handler that receives the validated query.
     * @param onInvalid - Optional callback to customize invalid responses. If it
     *   returns `{ statusCode, body }`, that is sent instead of the default zod
     *   error payload.
     */
    const withQuery = (schema, handler, onInvalid) => invoke(async ({ request, response, aux }) => {
        const parsed = schema.safeParse(request.query);
        if (!parsed.success) {
            logger.error(`Validation failed: ${(0, utils_1.stringifyError)((0, zod_1.treeifyError)(parsed.error))}`);
            if (onInvalid) {
                const result = await onInvalid(parsed.error);
                if (result) {
                    return response.fail(result.body, result.statusCode);
                }
            }
            return response.fail((0, zod_1.treeifyError)(parsed.error), 400);
        }
        const typedRequest = request;
        typedRequest.query = parsed.data;
        return handler({
            request: typedRequest,
            response,
            aux,
        });
    });
    return Object.assign(invoke, {
        withBody,
        withQuery,
    });
};
exports.default = build;
