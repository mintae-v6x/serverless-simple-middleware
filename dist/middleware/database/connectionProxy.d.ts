import { MySQLPluginOptions } from '../mysql';
export declare class ConnectionProxy {
    private readonly options;
    private connection?;
    private connectionConfig;
    private secretsCache;
    private configInitOnce;
    private connectionInitOnce;
    private initialized;
    private dbName?;
    private readonly MAX_RETRIES;
    constructor(options: MySQLPluginOptions);
    query: <T>(sql: string, params?: any[]) => Promise<T | undefined>;
    fetch: <T>(sql: string, params?: any[]) => Promise<T[]>;
    fetchOne: <T>(sql: string, params?: any[], defaultValue?: T) => Promise<T>;
    beginTransaction: () => Promise<void>;
    commit: () => Promise<void>;
    rollback: () => Promise<void>;
    clearConnection: () => void;
    /**
     * Destroy the connection socket immediately. No further events or callbacks will be triggered.
     * This should be used only for special use cases!
     */
    destroyConnection: () => void;
    onPluginCreated: () => Promise<void>;
    private prepareConnection;
    private createConnection;
    private ensureConnectionConfig;
    private changeDatabase;
    private tryToInitializeSchema;
}
