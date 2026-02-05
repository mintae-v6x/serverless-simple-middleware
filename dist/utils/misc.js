"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stringifyError = void 0;
const AwsError_1 = require("../internal/AwsError");
const stringifyError = (err, replacer, space) => {
    const error = isAWSv3Error(err) ? new AwsError_1.AwsError(err) : err;
    const plainObject = {};
    Object.getOwnPropertyNames(error).forEach((key) => {
        plainObject[key] = error[key];
    });
    return JSON.stringify(plainObject, replacer, space);
};
exports.stringifyError = stringifyError;
const isAWSv3Error = (error) => {
    return error instanceof Error && 'name' in error && '$metadata' in error;
};
