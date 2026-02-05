"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.middleware = void 0;
const build_1 = require("./build");
const buildWebSocket_1 = require("./buildWebSocket");
const aws_1 = require("./aws");
const logger_1 = require("./logger");
const mysql_1 = require("./mysql");
const trace_1 = require("./trace");
exports.middleware = {
    build: build_1.default,
    buildWebSocket: buildWebSocket_1.default,
    aws: aws_1.default,
    trace: trace_1.default,
    logger: logger_1.default,
    mysql: mysql_1.default,
};
__exportStar(require("./aws"), exports);
__exportStar(require("./base"), exports);
__exportStar(require("./database/index"), exports);
__exportStar(require("./logger"), exports);
__exportStar(require("./mysql"), exports);
__exportStar(require("./trace"), exports);
__exportStar(require("./websocketBase"), exports);
