"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimpleAWS = void 0;
const cloudfront_signer_1 = require("@aws-sdk/cloudfront-signer");
const simple_staging_1 = require("simple-staging");
const fs = require("fs");
const non_secure_1 = require("nanoid/non-secure");
const os = require("os");
const utils_1 = require("../utils");
const config_1 = require("./config");
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const client_s3_1 = require("@aws-sdk/client-s3");
const client_sqs_1 = require("@aws-sdk/client-sqs");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const lib_storage_1 = require("@aws-sdk/lib-storage");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const define_1 = require("./define");
const logger = (0, utils_1.getLogger)(__filename);
class SimpleAWS {
    queueUrls = {};
    config;
    lazyS3;
    lazySqs;
    lazyDynamodb;
    lazyDynamodbAdmin;
    static stageTag = {
        Key: 'STAGE',
        Value: simple_staging_1.envDefault.level,
    };
    static stringifiedStageTag = `STAGE=${simple_staging_1.envDefault.level}`;
    constructor(config) {
        this.config = config || new config_1.SimpleAWSConfig();
        /**
         * The simple cache for { queueName: queueUrl }.
         * It can help in the only case of launching this project as offline.
         * @type { { [queueName: string]: string } }
         */
        this.queueUrls = {};
    }
    get s3() {
        if (this.lazyS3 === undefined) {
            this.lazyS3 = new client_s3_1.S3(this.config.get(define_1.AWSComponent.s3) || {});
        }
        return this.lazyS3;
    }
    get sqs() {
        if (this.lazySqs === undefined) {
            this.lazySqs = new client_sqs_1.SQS(this.config.get(define_1.AWSComponent.sqs) || {});
        }
        return this.lazySqs;
    }
    get dynamodb() {
        if (this.lazyDynamodb === undefined) {
            this.lazyDynamodb = lib_dynamodb_1.DynamoDBDocument.from(new client_dynamodb_1.DynamoDBClient(this.config.get(define_1.AWSComponent.dynamodb) || {}), {
                marshallOptions: {
                    convertEmptyValues: true,
                    removeUndefinedValues: true,
                },
            });
        }
        return this.lazyDynamodb;
    }
    get dynamodbAdmin() {
        if (this.lazyDynamodbAdmin === undefined) {
            this.lazyDynamodbAdmin = new client_dynamodb_1.DynamoDB(this.config.get(define_1.AWSComponent.dynamodb) || {});
        }
        return this.lazyDynamodbAdmin;
    }
    getQueueUrl = async (queueName) => {
        if (this.queueUrls[queueName] !== undefined) {
            return this.queueUrls[queueName];
        }
        const urlResult = await this.sqs.getQueueUrl({
            QueueName: queueName,
        });
        logger.stupid(`urlResult`, urlResult);
        if (!urlResult.QueueUrl) {
            throw new Error(`No queue url with name[${queueName}]`);
        }
        return (this.queueUrls[queueName] = urlResult.QueueUrl);
    };
    enqueue = async (queueName, data) => {
        logger.debug(`Send message[${data.key}] to queue.`);
        logger.stupid(`data`, data);
        const queueUrl = await this.getQueueUrl(queueName);
        const sendResult = await this.sqs.sendMessage({
            QueueUrl: queueUrl,
            MessageBody: JSON.stringify(data),
            DelaySeconds: 0,
        });
        logger.stupid(`sendResult`, sendResult);
        const attrResult = await this.sqs.getQueueAttributes({
            QueueUrl: queueUrl,
            AttributeNames: ['ApproximateNumberOfMessages'],
        });
        logger.stupid(`attrResult`, attrResult);
        if (!attrResult.Attributes) {
            return 0;
        }
        return +(attrResult.Attributes?.ApproximateNumberOfMessages || 0);
    };
    dequeue = async (queueName, fetchSize = 1, waitSeconds = 1, visibilityTimeout = 15) => {
        logger.debug(`Receive message from queue[${queueName}].`);
        const queueUrl = await this.getQueueUrl(queueName);
        const receiveResult = await this.sqs.receiveMessage({
            QueueUrl: queueUrl,
            MaxNumberOfMessages: fetchSize,
            WaitTimeSeconds: waitSeconds,
            VisibilityTimeout: visibilityTimeout,
        });
        logger.stupid(`receiveResult`, receiveResult);
        if (receiveResult.Messages === undefined ||
            receiveResult.Messages.length === 0) {
            return [];
        }
        const data = [];
        for (const each of receiveResult.Messages) {
            if (!each.ReceiptHandle) {
                logger.warn(`No receipt handler: ${JSON.stringify(each)}`);
                continue;
            }
            const message = {
                handle: each.ReceiptHandle,
                body: each.Body ? JSON.parse(each.Body) : undefined,
            };
            data.push(message);
        }
        logger.verbose(`Receive a message[${JSON.stringify(data)}] from queue`);
        return data;
    };
    dequeueAll = async (queueName, limitSize = Number.MAX_VALUE, visibilityTimeout = 15) => {
        const messages = [];
        const maxFetchSize = 10; // This is max-value for fetching in each time.
        while (messages.length < limitSize) {
            const eachOfMessages = await this.dequeue(queueName, Math.min(limitSize - messages.length, maxFetchSize), 0, visibilityTimeout);
            if (!eachOfMessages || eachOfMessages.length === 0) {
                break;
            }
            for (const each of eachOfMessages) {
                messages.push(each);
            }
        }
        logger.stupid(`messages`, messages);
        return messages;
    };
    retainMessage = async (queueName, handle, seconds) => {
        logger.debug(`Change visibilityTimeout of ${handle} to ${seconds}secs.`);
        const queueUrl = await this.getQueueUrl(queueName);
        await this.sqs.changeMessageVisibility({
            QueueUrl: queueUrl,
            ReceiptHandle: handle,
            VisibilityTimeout: seconds,
        });
        return handle;
    };
    completeMessage = async (queueName, handle) => {
        logger.debug(`Complete a message with handle[${handle}]`);
        const queueUrl = await this.getQueueUrl(queueName);
        const deleteResult = await this.sqs.deleteMessage({
            QueueUrl: queueUrl,
            ReceiptHandle: handle,
        });
        logger.stupid(`deleteResult`, deleteResult);
        return handle;
    };
    completeMessages = async (queueName, handles) => {
        logger.debug(`Complete a message with handle[${handles}]`);
        if (!handles) {
            return handles;
        }
        const chunkSize = 10;
        let index = 0;
        for (let start = 0; start < handles.length; start += chunkSize) {
            const end = Math.min(start + chunkSize, handles.length);
            const sublist = handles.slice(start, end);
            const queueUrl = await this.getQueueUrl(queueName);
            const deletesResult = await this.sqs.deleteMessageBatch({
                QueueUrl: queueUrl,
                Entries: sublist.map((handle) => ({
                    Id: (++index).toString(),
                    ReceiptHandle: handle,
                })),
            });
            logger.stupid(`deleteResult`, deletesResult);
        }
        return handles;
    };
    download = async (bucket, key, localPath) => {
        logger.debug(`Get a stream of item[${key}] from bucket[${bucket}]`);
        const { Body } = await this.s3.getObject({ Bucket: bucket, Key: key });
        return new Promise((resolve, reject) => Body
            .on('error', (error) => reject(error))
            .pipe(fs.createWriteStream(localPath))
            .on('finish', () => resolve(localPath))
            .on('error', (error) => reject(error)));
    };
    readFile = async (bucket, key) => {
        logger.debug(`Read item[${key}] from bucket[${bucket}]`);
        const tempFile = `${os.tmpdir()}/${(0, non_secure_1.nanoid)()}`;
        try {
            await this.download(bucket, key, tempFile);
            const content = await fs.promises.readFile(tempFile, {
                encoding: 'utf-8',
            });
            return content;
        }
        finally {
            if (fs.existsSync(tempFile)) {
                try {
                    await fs.promises.unlink(tempFile);
                }
                catch (error) {
                    logger.error(`Failed to delete temp file ${tempFile}: ${(0, utils_1.stringifyError)(error)}`);
                }
            }
        }
    };
    readFileBuffer = async (bucket, key) => {
        logger.debug(`Read item[${key}] from bucket[${bucket}]`);
        const { Body } = await this.s3.getObject({ Bucket: bucket, Key: key });
        const buffer = await Body?.transformToByteArray();
        if (!buffer) {
            throw new Error(`Failed to read file ${key} from bucket ${bucket}`);
        }
        return Buffer.from(buffer);
    };
    upload = async (bucket, localPath, key, tags) => {
        logger.debug(`Upload item[${key}] into bucket[${bucket}]`);
        const upload = new lib_storage_1.Upload({
            client: this.s3,
            params: {
                Bucket: bucket,
                Key: key,
                Body: fs.createReadStream(localPath),
            },
            partSize: 5 * 1024 * 1024, // 5MB
            queueSize: 4,
            tags: [SimpleAWS.stageTag, ...(tags || [])],
        });
        await upload.done();
        return key;
    };
    uploadFromBuffer = async (bucket, key, buffer, tags) => {
        logger.debug(`Upload item[${key}] into bucket[${bucket}]`);
        const upload = new lib_storage_1.Upload({
            client: this.s3,
            params: {
                Bucket: bucket,
                Key: key,
                Body: buffer,
            },
            partSize: 5 * 1024 * 1024, // 5MB
            queueSize: 4,
            tags: [SimpleAWS.stageTag, ...(tags || [])],
        });
        await upload.done();
        return key;
    };
    writeFile = async (bucket, key, content) => {
        logger.debug(`Write item[${key}] into bucket[${bucket}]`);
        const tempFile = `${os.tmpdir()}/${(0, non_secure_1.nanoid)()}`;
        try {
            await fs.promises.writeFile(tempFile, content, 'utf-8');
            await this.upload(bucket, tempFile, key);
        }
        finally {
            if (!fs.existsSync(tempFile)) {
                return;
            }
            try {
                await fs.promises.unlink(tempFile);
            }
            catch (error) {
                const msg = `Error during writeFile: unlink file ${tempFile}: ${(0, utils_1.stringifyError)(error)}`;
                logger.error(msg);
            }
        }
    };
    async getSignedUrl(options) {
        const { expiresIn = 600, unhoistableHeaders } = options;
        switch (options.operation) {
            case 'putObject': {
                const tagging = options.params?.Tagging
                    ? SimpleAWS.stringifiedStageTag + '&' + options.params.Tagging
                    : SimpleAWS.stringifiedStageTag;
                const cmd = new client_s3_1.PutObjectCommand({
                    Bucket: options.bucket,
                    Key: options.key,
                    ...options.params,
                    Tagging: tagging,
                });
                return (0, s3_request_presigner_1.getSignedUrl)(this.s3, cmd, {
                    expiresIn: expiresIn,
                    unhoistableHeaders,
                });
            }
            case 'getObject': {
                const cmd = new client_s3_1.GetObjectCommand({
                    Bucket: options.bucket,
                    Key: options.key,
                    ...options.params,
                });
                return (0, s3_request_presigner_1.getSignedUrl)(this.s3, cmd, {
                    expiresIn: expiresIn,
                    unhoistableHeaders,
                });
            }
            case 'deleteObject': {
                const cmd = new client_s3_1.DeleteObjectCommand({
                    Bucket: options.bucket,
                    Key: options.key,
                    ...options.params,
                });
                return (0, s3_request_presigner_1.getSignedUrl)(this.s3, cmd, {
                    expiresIn: expiresIn,
                    unhoistableHeaders,
                });
            }
            case 'headObject': {
                const cmd = new client_s3_1.HeadObjectCommand({
                    Bucket: options.bucket,
                    Key: options.key,
                    ...options.params,
                });
                return (0, s3_request_presigner_1.getSignedUrl)(this.s3, cmd, {
                    expiresIn: expiresIn,
                    unhoistableHeaders,
                });
            }
            case 'copyObject': {
                const cmd = new client_s3_1.CopyObjectCommand({
                    Bucket: options.bucket,
                    Key: options.key,
                    ...options.params,
                });
                return (0, s3_request_presigner_1.getSignedUrl)(this.s3, cmd, {
                    expiresIn: expiresIn,
                    unhoistableHeaders,
                });
            }
            case 'uploadPart': {
                const cmd = new client_s3_1.UploadPartCommand({
                    Bucket: options.bucket,
                    Key: options.key,
                    ...options.params,
                });
                return (0, s3_request_presigner_1.getSignedUrl)(this.s3, cmd, {
                    expiresIn: expiresIn,
                    unhoistableHeaders,
                });
            }
            case 'uploadPartCopy': {
                const cmd = new client_s3_1.UploadPartCopyCommand({
                    Bucket: options.bucket,
                    Key: options.key,
                    ...options.params,
                });
                return (0, s3_request_presigner_1.getSignedUrl)(this.s3, cmd, {
                    expiresIn: expiresIn,
                    unhoistableHeaders,
                });
            }
            case 'listObjectsV2': {
                const cmd = new client_s3_1.ListObjectsV2Command({
                    Bucket: options.bucket,
                    ...options.params,
                });
                return (0, s3_request_presigner_1.getSignedUrl)(this.s3, cmd, {
                    expiresIn: expiresIn,
                    unhoistableHeaders,
                });
            }
            case 'createMultipartUpload': {
                const tagging = options.params?.Tagging
                    ? SimpleAWS.stringifiedStageTag + '&' + options.params.Tagging
                    : SimpleAWS.stringifiedStageTag;
                const cmd = new client_s3_1.CreateMultipartUploadCommand({
                    Bucket: options.bucket,
                    Key: options.key,
                    ...options.params,
                    Tagging: tagging,
                });
                return (0, s3_request_presigner_1.getSignedUrl)(this.s3, cmd, {
                    expiresIn: expiresIn,
                    unhoistableHeaders,
                });
            }
            case 'completeMultipartUpload': {
                const cmd = new client_s3_1.CompleteMultipartUploadCommand({
                    Bucket: options.bucket,
                    Key: options.key,
                    ...options.params,
                });
                return (0, s3_request_presigner_1.getSignedUrl)(this.s3, cmd, {
                    expiresIn: expiresIn,
                    unhoistableHeaders,
                });
            }
            case 'abortMultipartUpload': {
                const cmd = new client_s3_1.AbortMultipartUploadCommand({
                    Bucket: options.bucket,
                    Key: options.key,
                    ...options.params,
                });
                return (0, s3_request_presigner_1.getSignedUrl)(this.s3, cmd, {
                    expiresIn: expiresIn,
                    unhoistableHeaders,
                });
            }
            case 'listParts': {
                const cmd = new client_s3_1.ListPartsCommand({
                    Bucket: options.bucket,
                    Key: options.key,
                    ...options.params,
                });
                return (0, s3_request_presigner_1.getSignedUrl)(this.s3, cmd, {
                    expiresIn: expiresIn,
                    unhoistableHeaders,
                });
            }
        }
    }
    getSignedCookie = (keyPairId, privateKey, url, expires) => {
        const policy = JSON.stringify({
            Statement: [
                {
                    Resource: url,
                    Condition: {
                        DateLessThan: { 'AWS:EpochTime': expires },
                    },
                },
            ],
        });
        return (0, cloudfront_signer_1.getSignedCookies)({
            keyPairId,
            privateKey,
            policy,
        });
    };
    /**
     * Get signed URL for CloudFront
     * @param expiresSec - The expiration time in seconds (default 7 days)
     */
    getCloudFrontSignedUrl = (keyPairId, privateKey, url, expiresSec = 7 * 24 * 60 * 60) => {
        return (0, cloudfront_signer_1.getSignedUrl)({
            keyPairId,
            privateKey,
            url,
            dateLessThan: new Date(Date.now() + expiresSec * 1000),
        });
    };
    getDynamoDbItem = async (tableName, key, defaultValue) => {
        logger.debug(`Read an item with key[${JSON.stringify(key)}] from ${tableName}.`);
        const getResult = await this.dynamodb.get({
            TableName: tableName,
            Key: key,
        });
        logger.stupid(`getResult`, getResult);
        const item = getResult !== undefined && getResult.Item !== undefined
            ? getResult.Item // Casts forcefully.
            : defaultValue;
        logger.stupid(`item`, item);
        return item;
    };
    updateDynamoDbItem = async (tableName, key, columnValues) => {
        logger.debug(`Update an item with key[${JSON.stringify(key)}] to ${tableName}`);
        logger.stupid(`keyValues`, columnValues);
        const expressions = Object.keys(columnValues)
            .map((column) => `${column} = :${column}`)
            .join(', ');
        const attributeValues = Object.keys(columnValues)
            .map((column) => [`:${column}`, columnValues[column]])
            .reduce((obj, pair) => ({ ...obj, [pair[0]]: pair[1] }), {});
        logger.stupid(`expressions`, expressions);
        logger.stupid(`attributeValues`, attributeValues);
        const updateResult = await this.dynamodb.update({
            TableName: tableName,
            Key: key,
            UpdateExpression: `set ${expressions}`,
            ExpressionAttributeValues: attributeValues,
        });
        logger.stupid(`updateResult`, updateResult);
        return updateResult;
    };
    // Setup
    setupQueue = async (queueName) => {
        try {
            const listResult = await this.sqs.listQueues({
                QueueNamePrefix: queueName,
            });
            if (listResult.QueueUrls) {
                for (const queueUrl of listResult.QueueUrls) {
                    if (queueUrl.endsWith(queueName)) {
                        logger.debug(`Queue[${queueName} => ${queueUrl}] already exists.`);
                        return true;
                    }
                }
            }
        }
        catch (error) {
            logger.debug(`No Queue[${queueName}] exists due to ${error}`);
        }
        logger.debug(`Create a queue[${queueName}] newly.`);
        const createResult = await this.sqs.createQueue({
            QueueName: queueName,
        });
        logger.stupid(`createResult`, createResult);
        return true;
    };
    setupStorage = async (bucketName, cors) => {
        try {
            const listResult = await this.s3.listBuckets();
            if (listResult.Buckets &&
                listResult.Buckets.map((each) => each.Name).includes(bucketName)) {
                logger.debug(`Bucket[${bucketName}] already exists.`);
                return true;
            }
        }
        catch (error) {
            logger.debug(`No bucket[${bucketName}] exists due to ${error}`);
        }
        logger.debug(`Create a bucket[${bucketName}] newly.`);
        const createResult = await this.s3.createBucket({
            Bucket: bucketName,
        });
        logger.stupid(`createResult`, createResult);
        if (cors) {
            const corsResult = await this.s3.putBucketCors({
                Bucket: bucketName,
                CORSConfiguration: {
                    CORSRules: [
                        {
                            AllowedHeaders: ['*'],
                            AllowedMethods: cors.methods,
                            AllowedOrigins: cors.origins,
                        },
                    ],
                },
            });
            logger.stupid(`corsResult`, corsResult);
        }
        return true;
    };
    setupDynamoDb = async (tableName, keyColumn) => {
        try {
            const listResult = await this.dynamodbAdmin.listTables();
            if (listResult.TableNames && listResult.TableNames.includes(tableName)) {
                logger.debug(`Table[${tableName}] already exists.`);
                return true;
            }
        }
        catch (error) {
            logger.debug(`No table[${tableName}] exists due to ${error}`);
        }
        logger.debug(`Create a table[${tableName}] newly.`);
        const createResult = await this.dynamodbAdmin.createTable({
            TableName: tableName,
            KeySchema: [{ AttributeName: keyColumn, KeyType: 'HASH' }],
            AttributeDefinitions: [{ AttributeName: keyColumn, AttributeType: 'S' }],
            ProvisionedThroughput: {
                ReadCapacityUnits: 30,
                WriteCapacityUnits: 10,
            },
        });
        logger.stupid(`createResult`, createResult);
        return true;
    };
}
exports.SimpleAWS = SimpleAWS;
