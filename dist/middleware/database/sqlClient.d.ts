import { Kysely } from 'kysely';
import { MySQLPluginOptions } from '../mysql';
export declare class SQLClient<T = unknown> extends Kysely<T> {
    private pool;
    constructor(config: MySQLPluginOptions);
    clearConnection: () => Promise<void>;
    /**
     * Destroy the connection socket immediately. No further events or callbacks will be triggered.
     * This should be used only for special use cases!
     */
    destroyConnection: () => void;
}
export { expressionBuilder, sql, type DeleteQueryBuilder, type DeleteResult, type Expression, type ExpressionBuilder, type InferResult, type Insertable, type InsertQueryBuilder, type InsertResult, type NotNull, type RawBuilder, type Selectable, type SelectQueryBuilder, type SqlBool, type Transaction, type Updateable, type UpdateQueryBuilder, type UpdateResult } from 'kysely';
