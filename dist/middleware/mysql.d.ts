import type { SecretsManagerClientConfig } from '@aws-sdk/client-secrets-manager';
import type { ConnectionOptions, PoolOptions } from 'mysql2';
import { HandlerAuxBase, HandlerPluginBase } from './base';
import { ConnectionProxy } from './database/connectionProxy';
import { SQLClient } from './database/sqlClient';
export interface DatabaseCredentials {
    username: string;
    password: string;
}
export interface MySQLPluginOptions {
    config: ConnectionOptions & PoolOptions;
    /**
     * AWS Secrets Manager secret ID containing {@link DatabaseCredentials}
     */
    secretId?: string;
    secretsManagerConfig?: SecretsManagerClientConfig;
    schema?: {
        eager?: boolean;
        ignoreError?: boolean;
        database?: string;
        tables?: {
            [tableName: string]: string;
        };
    };
}
export interface MySQLPluginAux<T = unknown> extends HandlerAuxBase {
    db: ConnectionProxy;
    database: SQLClient<T>;
}
export declare class MySQLPlugin<T = unknown> extends HandlerPluginBase<MySQLPluginAux<T>> {
    private proxy;
    private sqlClient;
    constructor(options: MySQLPluginOptions);
    create: () => Promise<{
        db: ConnectionProxy;
        database: SQLClient<T>;
    }>;
    end: () => void;
}
declare const build: (options: MySQLPluginOptions) => MySQLPlugin<unknown>;
export default build;
