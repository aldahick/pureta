declare module "promise-events" {
    import * as events from "events";

    export class EventEmitter extends events.EventEmitter {
        addListener<T>(eventName: string, listener: (...args: any[]) => Promise<T>): Promise<void>;
        emit<T>(eventName: string, ...args: any[]): Promise<T[]>;
        on<T>(eventName: string, listener: (...args: any[]) => Promise<T>): Promise<void>;
        once<T>(eventName: string, listener: (...args: any[]) => Promise<T>): Promise<void>;
        prependListener<T>(eventName: string, listener: (...args: any[]) => Promise<T>): Promise<void>;
        prependOnceListener<T>(eventName: string, listener: (...args: any[]) => Promise<T>): Promise<void>;
        removeAllListeners(eventName: string | undefined): Promise<void>;
        removeListener<T>(eventName: string, listener: (...args: any[]) => Promise<T>): Promise<void>;
        // have to have these to override default EventEmitter methods
        // https://stackoverflow.com/a/39923895
        addListener(): never;
        emit(): never;
        on(): never;
        once(): never;
        prependListener(): never;
        prependOnceListener(): never;
        removeAllListeners(): never;
        removeListener(): never;
    }
}
