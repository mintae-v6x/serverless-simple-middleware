"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HandlerPluginBase = exports.HandlerResponse = exports.HandlerRequest = void 0;
const logger_1 = require("../utils/logger");
const logger = (0, logger_1.getLogger)(__filename);
class HandlerRequest {
    event;
    context;
    lastError;
    lazyBody;
    constructor(event, context) {
        this.event = event;
        this.context = context;
        this.lastError = undefined;
        const normalizedHeaders = {};
        if (this.event.headers) {
            for (const key of Object.keys(this.event.headers)) {
                normalizedHeaders[key.toLowerCase()] = this.event.headers[key];
            }
        }
        this.event.headers = normalizedHeaders;
    }
    get body() {
        if (!this.event.body) {
            return {};
        }
        if (this.lazyBody === undefined) {
            this.lazyBody = JSON.parse(this.event.body);
        }
        return this.lazyBody || {};
    }
    set body(value) {
        this.lazyBody = value;
    }
    get path() {
        return this.event.pathParameters || {};
    }
    get query() {
        return this.event.queryStringParameters || {};
    }
    set query(value) {
        this.event.queryStringParameters = value;
    }
    header(key) {
        return this.event.headers[key.toLowerCase()];
    }
    records(selector) {
        const target = (this.event.Records || []);
        return selector === undefined ? target : target.map(selector);
    }
}
exports.HandlerRequest = HandlerRequest;
const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'X-Version',
    'Access-Control-Allow-Credentials': true,
};
class HandlerResponse {
    callback;
    completed;
    result;
    cookies;
    crossOrigin;
    customHeaders;
    constructor(callback) {
        this.callback = callback;
        this.completed = false;
        this.cookies = [];
        this.customHeaders = {};
    }
    ok(body = {}, code = 200) {
        logger.stupid(`ok`, body);
        const exposeHeaders = Object.keys(this.customHeaders).join(', ');
        const headers = {
            ...CORS_HEADERS,
            ...this.customHeaders,
        };
        if (exposeHeaders) {
            headers['Access-Control-Expose-Headers'] = exposeHeaders;
        }
        if (this.crossOrigin) {
            headers['Access-Control-Allow-Origin'] = this.crossOrigin;
        }
        let multiValueHeaders = undefined;
        if (this.cookies.length > 0) {
            multiValueHeaders = { 'Set-Cookie': this.cookies };
        }
        const result = this.callback(null, {
            statusCode: code,
            headers,
            multiValueHeaders,
            body: JSON.stringify(body),
        });
        this.completed = true;
        return result;
    }
    fail(body = {}, code = 500) {
        logger.stupid(`fail`, body);
        const result = this.callback(null, {
            statusCode: code,
            headers: CORS_HEADERS,
            body: JSON.stringify(body),
        });
        this.completed = true;
        return result;
    }
    addCookie(key, value, domain, sameSite, secure, path, httpOnly, maxAgeSeconds) {
        const keyValueStr = `${key}=${value}`;
        const domainStr = domain ? `Domain=${domain}` : '';
        const sameSiteStr = sameSite ? `SameSite=${sameSite}` : '';
        const secureStr = secure ? 'Secure' : '';
        const pathStr = path !== undefined ? `Path=${path}` : '';
        const httpOnlyStr = httpOnly ? 'HttpOnly' : '';
        const maxAgeStr = maxAgeSeconds || maxAgeSeconds === 0 ? `Max-Age=${maxAgeSeconds}` : '';
        const cookieStr = [
            keyValueStr,
            domainStr,
            sameSiteStr,
            secureStr,
            pathStr,
            httpOnlyStr,
            maxAgeStr,
        ]
            .filter((x) => x)
            .join('; ');
        this.cookies.push(cookieStr);
    }
    setCrossOrigin = (origin) => {
        this.crossOrigin = origin;
    };
    addHeader = (header, value) => {
        this.customHeaders[header] = value;
    };
}
exports.HandlerResponse = HandlerResponse;
class HandlerPluginBase {
    create = () => {
        throw new Error('Not yet implemented');
    };
    begin = (_) => {
        // do nothing
    };
    end = (_) => {
        // do nothing
    };
    error = (_) => {
        // do nothing
    };
}
exports.HandlerPluginBase = HandlerPluginBase;
