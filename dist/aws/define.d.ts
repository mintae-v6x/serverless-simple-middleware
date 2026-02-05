export declare enum AWSComponent {
    s3 = "s3",
    sqs = "sqs",
    dynamodb = "dynamodb"
}
export interface SQSMessageBody<T> {
    handle: string;
    body?: T;
}
