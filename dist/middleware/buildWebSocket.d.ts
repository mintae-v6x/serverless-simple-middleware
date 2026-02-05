import type { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';
import { HandlerPluginBase } from './base';
import { WebSocketHandler, WebSocketHandlerAuxBase } from './websocketBase';
declare const buildWebSocket: <Aux extends WebSocketHandlerAuxBase>(plugins: Array<HandlerPluginBase<any>>) => (handler: WebSocketHandler<Aux>) => APIGatewayProxyWebsocketHandlerV2;
export default buildWebSocket;
