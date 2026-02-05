export declare class AwsError extends Error {
    readonly name: string;
    readonly service: string;
    constructor(awsError: unknown);
}
