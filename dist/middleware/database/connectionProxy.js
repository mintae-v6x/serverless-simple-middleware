"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectionProxy = void 0;
const mysql2_1 = require("mysql2");
const oncePromise_1 = require("../../internal/oncePromise");
const utils_1 = require("../../utils");
const secretsManager_1 = require("../../utils/secretsManager");
const logger = (0, utils_1.getLogger)(__filename);
class ConnectionProxy {
    options;
    connection;
    connectionConfig;
    secretsCache;
    configInitOnce = new oncePromise_1.OncePromise();
    connectionInitOnce = new oncePromise_1.OncePromise();
    initialized;
    dbName;
    MAX_RETRIES = 1;
    constructor(options) {
        this.options = options;
        if (options.schema && options.schema.database) {
            this.dbName = options.config.database;
            options.config.database = undefined;
        }
        this.secretsCache = secretsManager_1.SecretsManagerCache.getInstance();
        if (options.secretsManagerConfig) {
            this.secretsCache.configure(options.secretsManagerConfig);
        }
    }
    query = (sql, params) => this.prepareConnection().then((connection) => this.tryToInitializeSchema(false).then(() => new Promise((resolve, reject) => {
        if (process.env.NODE_ENV !== 'test') {
            logger.silly(`Execute query[${sql}] with params[${params}]`);
        }
        connection.query(sql, params, (err, result, _fields) => {
            if (err) {
                logger.error(`error occurred in database query=${sql}, error=${err}`);
                reject(err);
            }
            else {
                resolve(result);
                if (process.env.NODE_ENV !== 'test') {
                    logger.silly(`DB result is ${JSON.stringify(result)}`);
                }
            }
        });
    })));
    fetch = (sql, params) => this.query(sql, params).then((res) => res || []);
    fetchOne = (sql, params, defaultValue) => this.fetch(sql, params).then((res) => {
        if (res === undefined || res[0] === undefined) {
            // Makes it as non-null result.
            return defaultValue || {};
        }
        return res[0];
    });
    beginTransaction = () => this.prepareConnection().then((connection) => this.tryToInitializeSchema(false).then(() => new Promise((resolve, reject) => {
        connection.beginTransaction((err) => {
            if (err) {
                reject(err);
                return;
            }
            resolve();
        });
    })));
    commit = () => this.prepareConnection().then((connection) => this.tryToInitializeSchema(false).then(() => new Promise((resolve, reject) => {
        connection.commit((err) => {
            if (err) {
                reject(err);
                return;
            }
            resolve();
        });
    })));
    rollback = () => this.prepareConnection().then((connection) => this.tryToInitializeSchema(false).then(() => new Promise((resolve, reject) => {
        connection.rollback((err) => {
            if (err) {
                reject(err);
                return;
            }
            resolve();
        });
    })));
    clearConnection = () => {
        const conn = this.connection;
        this.connection = undefined;
        this.connectionInitOnce.reset();
        if (conn) {
            try {
                conn.end();
            }
            catch (error) {
                logger.warn(`Error occurred while ending connection: ${error}`);
            }
        }
    };
    /**
     * Destroy the connection socket immediately. No further events or callbacks will be triggered.
     * This should be used only for special use cases!
     */
    destroyConnection = () => {
        const conn = this.connection;
        this.connection = undefined;
        this.connectionInitOnce.reset();
        if (conn) {
            try {
                conn.destroy();
            }
            catch (error) {
                logger.warn(`Error occurred while destroying connection: ${error}`);
            }
        }
    };
    onPluginCreated = async () => this.tryToInitializeSchema(true);
    prepareConnection = async () => {
        if (this.connection) {
            return this.connection;
        }
        return await this.connectionInitOnce.run(async () => {
            await this.ensureConnectionConfig();
            this.connection = await this.createConnection(this.MAX_RETRIES);
            return this.connection;
        });
    };
    createConnection = async (remainingRetries) => {
        const conn = (0, mysql2_1.createConnection)(this.connectionConfig);
        return new Promise((resolve, reject) => {
            conn.on('error', (err) => {
                logger.error(`Connection error event: ${err.message}`);
            });
            conn.connect((err) => {
                if (err) {
                    logger.error(`Failed to connect to database: ${err.message}`);
                    conn.destroy();
                    if (remainingRetries > 0) {
                        logger.warn(`Retrying database connection... (${remainingRetries} attempt(s) remaining)`);
                        setTimeout(() => {
                            this.createConnection(remainingRetries - 1)
                                .then(resolve)
                                .catch(reject);
                        }, 100);
                    }
                    else {
                        logger.error('Database connection failed after all retries. Giving up.');
                        reject(err);
                    }
                }
                else {
                    logger.verbose('Database connection established successfully.');
                    resolve(conn);
                }
            });
        });
    };
    ensureConnectionConfig = async () => {
        if (this.connectionConfig) {
            return;
        }
        await this.configInitOnce.run(async () => {
            const baseConfig = this.options.config;
            if (!this.options.secretId) {
                this.connectionConfig = baseConfig;
                return;
            }
            const credentials = await this.secretsCache.getDatabaseCredentials(this.options.secretId);
            this.connectionConfig = {
                ...baseConfig,
                user: credentials.username,
                password: credentials.password,
            };
        });
    };
    changeDatabase = async (dbName) => new Promise((resolve, reject) => this.prepareConnection()
        .then((connection) => connection.changeUser({
        database: dbName,
    }, (err) => (err ? reject(err) : resolve(undefined))))
        .catch(reject));
    tryToInitializeSchema = async (initial) => {
        const { eager = false, ignoreError = false, database = '', tables = {}, } = this.options.schema || {};
        if (initial && !eager) {
            return;
        }
        // This method can be called twice when eager option is on,
        // so this flag should be set and checked at first.
        if (this.initialized) {
            return;
        }
        this.initialized = true;
        try {
            if (database) {
                logger.debug(`Prepare a database[${this.dbName}]`);
                logger.stupid(this.dbName, database);
                const result = await this.query(database);
                logger.debug(`Database[${this.dbName}] is initialized: ${JSON.stringify(result)}`);
            }
            if (this.dbName) {
                await this.changeDatabase(this.dbName);
                logger.verbose(`Database[${this.dbName}] is connected.`);
            }
            for (const [name, query] of Object.entries(tables)) {
                logger.debug(`Prepare a table[${name}]`);
                logger.stupid(name, query);
                const result = await this.query(query);
                logger.debug(`Table[${name}] is initialized: ${JSON.stringify(result)}`);
            }
            logger.verbose(`Database schema is initialized.`);
        }
        catch (error) {
            logger.warn(error);
            if (!ignoreError) {
                throw error;
            }
        }
    };
}
exports.ConnectionProxy = ConnectionProxy;
