import { AWSComponent } from './define';
export interface AWSConfig {
    [key: string]: string | boolean | number | undefined;
}
export interface AWSConfigs {
    [service: string]: AWSConfig;
}
export type AWSConfigResolver = (service: string) => AWSConfig;
export type SimpleAWSConfigLoadParam = AWSConfigs | string;
export declare class SimpleAWSConfig {
    private configs;
    constructor(configs?: AWSConfigs);
    get: (service: AWSComponent) => AWSConfig | undefined;
}
export declare const loadAWSConfig: (newConfigsOrUrl: SimpleAWSConfigLoadParam) => Promise<SimpleAWSConfig>;
