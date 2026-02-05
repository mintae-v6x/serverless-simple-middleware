export declare class OncePromise<T> {
    private promise?;
    private factory?;
    constructor(factory?: () => Promise<T>);
    run(factory?: () => Promise<T>): Promise<T>;
    reset(): void;
}
