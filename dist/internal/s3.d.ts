import { DeleteObjectCommandInput, GetObjectCommandInput, PutObjectCommandInput, HeadObjectCommandInput, CopyObjectCommandInput, UploadPartCommandInput, UploadPartCopyCommandInput, AbortMultipartUploadCommandInput, CompleteMultipartUploadCommandInput, CreateMultipartUploadCommandInput, ListObjectsV2CommandInput, ListPartsCommandInput } from '@aws-sdk/client-s3/dist-types/commands';
export type S3Operation = 'putObject' | 'getObject' | 'deleteObject' | 'headObject' | 'copyObject' | 'uploadPart' | 'uploadPartCopy' | 'listObjectsV2' | 'createMultipartUpload' | 'completeMultipartUpload' | 'abortMultipartUpload' | 'listParts';
export type CommandInputMap = {
    putObject: PutObjectCommandInput;
    getObject: GetObjectCommandInput;
    deleteObject: DeleteObjectCommandInput;
    headObject: HeadObjectCommandInput;
    copyObject: CopyObjectCommandInput;
    uploadPart: UploadPartCommandInput;
    uploadPartCopy: UploadPartCopyCommandInput;
    listObjectsV2: ListObjectsV2CommandInput;
    createMultipartUpload: CreateMultipartUploadCommandInput;
    completeMultipartUpload: CompleteMultipartUploadCommandInput;
    abortMultipartUpload: AbortMultipartUploadCommandInput;
    listParts: ListPartsCommandInput;
};
type OpsWithRequiredParams = 'copyObject' | 'uploadPart' | 'uploadPartCopy' | 'createMultipartUpload' | 'completeMultipartUpload' | 'abortMultipartUpload' | 'listParts';
type OpsWithOptionalParams = Exclude<S3Operation, OpsWithRequiredParams>;
export type PresignerOptions = {
    [K in OpsWithOptionalParams]: {
        operation: K;
        bucket: string;
        key: string;
        params?: Omit<CommandInputMap[K], 'Bucket' | 'Key'>;
        expiresIn?: number;
        unhoistableHeaders?: Set<string>;
    };
}[OpsWithOptionalParams] | {
    [K in OpsWithRequiredParams]: {
        operation: K;
        bucket: string;
        key: string;
        params: Omit<CommandInputMap[K], 'Bucket' | 'Key'>;
        expiresIn?: number;
        unhoistableHeaders?: Set<string>;
    };
}[OpsWithRequiredParams];
export {};
