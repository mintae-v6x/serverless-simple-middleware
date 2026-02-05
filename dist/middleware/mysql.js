"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MySQLPlugin = void 0;
const base_1 = require("./base");
const connectionProxy_1 = require("./database/connectionProxy");
const sqlClient_1 = require("./database/sqlClient");
class MySQLPlugin extends base_1.HandlerPluginBase {
    proxy;
    sqlClient;
    constructor(options) {
        super();
        this.proxy = new connectionProxy_1.ConnectionProxy(options);
        this.sqlClient = new sqlClient_1.SQLClient(options);
    }
    create = async () => {
        await this.proxy.onPluginCreated();
        return { db: this.proxy, database: this.sqlClient };
    };
    end = () => {
        if (this.proxy) {
            this.proxy.clearConnection();
        }
        if (this.sqlClient) {
            this.sqlClient.clearConnection();
        }
    };
}
exports.MySQLPlugin = MySQLPlugin;
const build = (options) => new MySQLPlugin(options);
exports.default = build;
