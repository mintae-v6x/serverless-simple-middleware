import { Logger, LogLevel } from '../utils';
import { HandlerAuxBase, HandlerPluginBase } from './base';
export interface LoggerPluginOptions {
    name: string;
    level?: LogLevel;
}
export interface LoggerPluginAux extends HandlerAuxBase {
    logger: Logger;
}
export declare class LoggerPlugin extends HandlerPluginBase<LoggerPluginAux> {
    private options;
    constructor(options: LoggerPluginOptions);
    create: () => Promise<{
        logger: Logger;
    }>;
}
declare const build: (options: LoggerPluginOptions) => LoggerPlugin;
export default build;
