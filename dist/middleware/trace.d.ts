import { SimpleAWSConfigLoadParam } from '../aws';
import { SQS } from '@aws-sdk/client-sqs';
import { HandlerAuxBase, HandlerContext, HandlerPluginBase } from './base';
interface ITracerLog {
    uuid: string;
    timestamp: number;
    route: string;
    key: string;
    system: string;
    action: string;
    attribute: string;
    body: string;
    error: boolean;
    client: string;
    version: string;
}
interface ITracerLogInput {
    route?: string;
    key?: string;
    system?: string;
    action?: string;
    attribute: string;
    body: string;
    error?: boolean;
    client?: string;
    version?: string;
}
export declare class TracerLog implements ITracerLog {
    readonly route: string;
    readonly key: string;
    readonly system: string;
    readonly action: string;
    readonly attribute: string;
    readonly body: string;
    readonly error: boolean;
    readonly client: string;
    readonly version: string;
    readonly uuid: string;
    readonly timestamp: number;
    constructor(route: string, key: string, system: string, action: string, attribute: string, body: string, error: boolean, client: string, version: string);
}
export declare class Tracer {
    private queueName;
    private sqs;
    private buffer;
    constructor(queueName: string, sqs: SQS);
    push: (log: TracerLog) => number;
    flush: () => Promise<void>;
}
export declare class TracerWrapper {
    private tracer;
    private route;
    private system;
    private key;
    private action;
    private client;
    private version;
    constructor(tracer: Tracer, route: string, system: string, key: string, action: string, client: string, version: string);
    push: (attribute: string, body: string, error?: boolean) => void;
    send: (log: ITracerLogInput) => void;
}
export interface TracerPluginOptions {
    route: string;
    queueName: string;
    system: string;
    awsConfig?: SimpleAWSConfigLoadParam;
    region?: string;
}
export interface TracerPluginAux extends HandlerAuxBase {
    tracer: (key: string, action: string) => TracerWrapper;
}
export declare class TracerPlugin extends HandlerPluginBase<TracerPluginAux> {
    private tracer;
    private options;
    private last;
    private client;
    constructor(options: TracerPluginOptions);
    create: () => Promise<{
        tracer: (key: string, action: string) => TracerWrapper;
    }>;
    begin: ({ request }: HandlerContext<TracerPluginAux>) => void;
    end: () => Promise<void>;
    error: ({ request, aux }: HandlerContext<TracerPluginAux>) => void;
}
declare const build: (options: TracerPluginOptions) => TracerPlugin;
export default build;
