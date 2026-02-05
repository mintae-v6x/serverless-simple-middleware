import { type ZodError, type ZodSchema } from 'zod';
import { Handler, HandlerAuxBase, HandlerPluginBase, HandlerRequest, HandlerResponse } from './base';
declare const build: <Aux extends HandlerAuxBase>(plugins: Array<HandlerPluginBase<any>>) => ((handler: Handler<Aux>) => (event: any, context: any, callback: any) => void) & {
    withBody: <S>(schema: ZodSchema<S>, handler: (context: {
        request: Omit<HandlerRequest, "body"> & {
            body: S;
        };
        response: HandlerResponse;
        aux: Aux;
    }) => any, onInvalid?: (error: ZodError) => {
        statusCode: number;
        body: any;
    } | Promise<{
        statusCode: number;
        body: any;
    } | void> | void) => (event: any, context: any, callback: any) => void;
    withQuery: <Q>(schema: ZodSchema<Q>, handler: (context: {
        request: Omit<HandlerRequest, "query"> & {
            query: Q;
        };
        response: HandlerResponse;
        aux: Aux;
    }) => any, onInvalid?: (error: ZodError<Q>) => {
        statusCode: number;
        body: any;
    } | Promise<{
        statusCode: number;
        body: any;
    } | void> | void) => (event: any, context: any, callback: any) => void;
};
export default build;
