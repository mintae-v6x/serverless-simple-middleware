import { CloudfrontSignedCookiesOutput } from '@aws-sdk/cloudfront-signer';
import { SimpleAWSConfig } from './config';
import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { S3, Tag } from '@aws-sdk/client-s3';
import { SQS } from '@aws-sdk/client-sqs';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import { PresignerOptions } from '../internal/s3';
import { SQSMessageBody } from './define';
export declare class SimpleAWS {
    private queueUrls;
    private config;
    private lazyS3;
    private lazySqs;
    private lazyDynamodb;
    private lazyDynamodbAdmin;
    private static readonly stageTag;
    private static readonly stringifiedStageTag;
    constructor(config?: SimpleAWSConfig);
    get s3(): S3;
    get sqs(): SQS;
    get dynamodb(): DynamoDBDocument;
    get dynamodbAdmin(): DynamoDB;
    getQueueUrl: (queueName: string) => Promise<string>;
    enqueue: (queueName: string, data: any) => Promise<number>;
    dequeue: <T>(queueName: string, fetchSize?: number, waitSeconds?: number, visibilityTimeout?: number) => Promise<Array<SQSMessageBody<T>>>;
    dequeueAll: <T>(queueName: string, limitSize?: number, visibilityTimeout?: number) => Promise<Array<SQSMessageBody<T>>>;
    retainMessage: (queueName: string, handle: string, seconds: number) => Promise<string>;
    completeMessage: (queueName: string, handle: string) => Promise<string>;
    completeMessages: (queueName: string, handles: string[]) => Promise<string[]>;
    download: (bucket: string, key: string, localPath: string) => Promise<string>;
    readFile: (bucket: string, key: string) => Promise<string>;
    readFileBuffer: (bucket: string, key: string) => Promise<Buffer>;
    upload: (bucket: string, localPath: string, key: string, tags?: Tag[]) => Promise<string>;
    uploadFromBuffer: (bucket: string, key: string, buffer: Buffer, tags?: Tag[]) => Promise<string>;
    writeFile: (bucket: string, key: string, content: string) => Promise<void>;
    getSignedUrl(options: PresignerOptions): Promise<string>;
    getSignedCookie: (keyPairId: string, privateKey: string, url: string, expires: number) => CloudfrontSignedCookiesOutput;
    /**
     * Get signed URL for CloudFront
     * @param expiresSec - The expiration time in seconds (default 7 days)
     */
    getCloudFrontSignedUrl: (keyPairId: string, privateKey: string, url: string, expiresSec?: number) => string;
    getDynamoDbItem: <T>(tableName: string, key: {
        [keyColumn: string]: string;
    }, defaultValue?: T) => Promise<T | undefined>;
    updateDynamoDbItem: (tableName: string, key: {
        [keyColumn: string]: string;
    }, columnValues: {
        [column: string]: any;
    }) => Promise<import("@aws-sdk/lib-dynamodb").UpdateCommandOutput>;
    setupQueue: (queueName: string) => Promise<boolean>;
    setupStorage: (bucketName: string, cors: {
        methods: Array<"GET" | "POST" | "PUT" | "DELETE" | "HEAD">;
        origins: string[];
    }) => Promise<boolean>;
    setupDynamoDb: (tableName: string, keyColumn: string) => Promise<boolean>;
}
