"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AwsError = void 0;
class AwsError extends Error {
    name;
    service;
    constructor(awsError) {
        const errorObj = awsError;
        const message = errorObj?.message ?? 'Unknown AWS Error';
        super(message);
        this.name = errorObj?.name ?? 'UnclassifiedError';
        this.service = errorObj?.$service ?? 'UnknownService';
    }
}
exports.AwsError = AwsError;
