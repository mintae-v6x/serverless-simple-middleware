"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OncePromise = void 0;
class OncePromise {
    promise;
    factory;
    constructor(factory) {
        this.factory = factory;
    }
    async run(factory) {
        if (!this.promise) {
            const f = factory || this.factory;
            if (!f) {
                throw new Error('OncePromise requires a factory');
            }
            this.promise = f();
            try {
                return await this.promise;
            }
            catch (err) {
                this.promise = undefined;
                throw err;
            }
        }
        return this.promise;
    }
    reset() {
        this.promise = undefined;
    }
}
exports.OncePromise = OncePromise;
