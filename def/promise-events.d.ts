declare module "promise-events" {
    import * as events from "events";

    export class EventEmitter extends events.EventEmitter {
        addListener(eventName: string, listener: (...args: any[]) => Promise<void>): Promise<void>;
        emit<T>(eventName: string, ...args: any[]): Promise<T[]>;
        on(eventName: string, listener: (...args: any[]) => Promise<void>): Promise<void>;
        once(eventName: string, listener: (...args: any[]) => Promise<void>): Promise<void>;
        prependListener(eventName: string, listener: (...args: any[]) => Promise<void>): Promise<void>;
        prependOnceListener(eventName: string, listener: (...args: any[]) => Promise<void>): Promise<void>;
        removeAllListeners(eventName: string | undefined): Promise<void>;
        removeListener(eventName: string, listener: (...args: any[]) => Promise<void>): Promise<void>;
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
