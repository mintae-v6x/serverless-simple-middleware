import type { APIGatewayProxyWebsocketEventV2, Context } from 'aws-lambda';
export interface WebSocketHandlerAuxBase {
    [key: string]: any;
}
export declare class WebSocketHandlerRequest {
    event: APIGatewayProxyWebsocketEventV2;
    context: Context;
    lastError: Error | string | undefined;
    private lazyBody?;
    constructor(event: APIGatewayProxyWebsocketEventV2, context: Context);
    get body(): any;
    get connectionId(): string;
    get routeKey(): string;
    get domainName(): string;
    get stage(): string;
    /**
     * For HTTP plugin compatibility (TracerPlugin uses this).
     * WebSocket events may have headers in $connect route (HTTP handshake),
     * but typically don't have headers in other routes.
     */
    header(key: string): string | undefined;
}
export interface WebSocketHandlerResponse {
    statusCode: number;
    body?: string;
}
export interface WebSocketHandlerContext<A extends WebSocketHandlerAuxBase> {
    request: WebSocketHandlerRequest;
    response: undefined;
    aux: A;
}
export type WebSocketHandler<A extends WebSocketHandlerAuxBase> = (context: WebSocketHandlerContext<A>) => WebSocketHandlerResponse | Promise<WebSocketHandlerResponse> | undefined;
