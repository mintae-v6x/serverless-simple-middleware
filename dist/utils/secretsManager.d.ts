import { SecretsManagerClientConfig } from '@aws-sdk/client-secrets-manager';
import type { DatabaseCredentials } from '../middleware/mysql';
export declare class SecretsManagerCache {
    private static instance;
    private client;
    private clientConfig;
    private cache;
    private constructor();
    static getInstance(): SecretsManagerCache;
    configure(config: SecretsManagerClientConfig): void;
    private getClient;
    getSecret<T = any>(secretId: string): Promise<T>;
    getDatabaseCredentials(secretId: string): Promise<DatabaseCredentials>;
}
