import { SimpleAWS, SimpleAWSConfig, SimpleAWSConfigLoadParam } from '../aws';
import { HandlerAuxBase, HandlerPluginBase } from './base';
type InitializerMapper = (aws: SimpleAWS, env: {}) => {
    [name: string]: () => Promise<boolean>;
};
export interface AWSPluginOptions {
    config?: SimpleAWSConfigLoadParam;
    mapper?: InitializerMapper;
}
export interface AWSPluginAux extends HandlerAuxBase {
    aws: SimpleAWS;
    awsConfig: SimpleAWSConfig;
}
export declare class AWSPlugin extends HandlerPluginBase<AWSPluginAux> {
    private options?;
    private aws?;
    private config;
    constructor(options?: AWSPluginOptions);
    create: () => Promise<{
        aws: SimpleAWS;
        awsConfig: SimpleAWSConfig;
    }>;
}
declare const build: (options?: AWSPluginOptions) => AWSPlugin;
export default build;
