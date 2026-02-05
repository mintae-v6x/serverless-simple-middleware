export declare const middleware: {
    build: <Aux extends import("./base").HandlerAuxBase>(plugins: Array<import("./base").HandlerPluginBase<any>>) => ((handler: import("./base").Handler<Aux>) => (event: any, context: any, callback: any) => void) & {
        withBody: <S>(schema: import("zod").ZodType<S>, handler: (context: {
            request: Omit<import("./base").HandlerRequest, "body"> & {
                body: S;
            };
            response: import("./base").HandlerResponse;
            aux: Aux;
        }) => any, onInvalid?: (error: import("zod").ZodError) => {
            statusCode: number;
            body: any;
        } | Promise<{
            statusCode: number;
            body: any;
        } | void> | void) => (event: any, context: any, callback: any) => void;
        withQuery: <Q>(schema: import("zod").ZodType<Q>, handler: (context: {
            request: Omit<import("./base").HandlerRequest, "query"> & {
                query: Q;
            };
            response: import("./base").HandlerResponse;
            aux: Aux;
        }) => any, onInvalid?: (error: import("zod").ZodError<Q>) => {
            statusCode: number;
            body: any;
        } | Promise<{
            statusCode: number;
            body: any;
        } | void> | void) => (event: any, context: any, callback: any) => void;
    };
    buildWebSocket: <Aux extends import("./websocketBase").WebSocketHandlerAuxBase>(plugins: Array<import("./base").HandlerPluginBase<any>>) => (handler: import("./websocketBase").WebSocketHandler<Aux>) => import("aws-lambda").APIGatewayProxyWebsocketHandlerV2;
    aws: (options?: import("./aws").AWSPluginOptions) => import("./aws").AWSPlugin;
    trace: (options: import("./trace").TracerPluginOptions) => import("./trace").TracerPlugin;
    logger: (options: import("./logger").LoggerPluginOptions) => import("./logger").LoggerPlugin;
    mysql: (options: import("./mysql").MySQLPluginOptions) => import("./mysql").MySQLPlugin<unknown>;
};
export * from './aws';
export * from './base';
export * from './database/index';
export * from './logger';
export * from './mysql';
export * from './trace';
export * from './websocketBase';
