"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketHandlerRequest = void 0;
const logger_1 = require("../utils/logger");
const logger = (0, logger_1.getLogger)(__filename);
class WebSocketHandlerRequest {
    event;
    context;
    lastError;
    lazyBody;
    constructor(event, context) {
        this.event = event;
        this.context = context;
        this.lastError = undefined;
    }
    get body() {
        if (!this.event.body) {
            return {};
        }
        if (this.lazyBody === undefined) {
            try {
                this.lazyBody = JSON.parse(this.event.body);
            }
            catch (error) {
                logger.error(`Failed to parse WebSocket body: ${error}`);
                this.lazyBody = {};
            }
        }
        return this.lazyBody || {};
    }
    get connectionId() {
        return this.event.requestContext.connectionId;
    }
    get routeKey() {
        return this.event.requestContext.routeKey;
    }
    get domainName() {
        return this.event.requestContext.domainName;
    }
    get stage() {
        return this.event.requestContext.stage;
    }
    // HTTP plugin compatibility methods
    /**
     * For HTTP plugin compatibility (TracerPlugin uses this).
     * WebSocket events may have headers in $connect route (HTTP handshake),
     * but typically don't have headers in other routes.
     */
    header(key) {
        const event = this.event;
        if (event.headers) {
            return event.headers[key.toLowerCase()];
        }
        return undefined;
    }
}
exports.WebSocketHandlerRequest = WebSocketHandlerRequest;
