import * as _ from "lodash";
import * as events from "events";
import * as express from "express";
import * as http from "http";
import ServerOptions from "./options/ServerOptions";

export default class Server extends events.EventEmitter {
    public server: http.Server;
    public express: express.Application;
    public options: ServerOptions;

    public constructor(options: ServerOptions | undefined) {
        super();
        this.options = _.defaults<ServerOptions, ServerOptions>(options, {
            port: 3000,
            hostname: undefined
        });
    }

    public start(): Promise<void> {
        // don't want to start server if it's already started
        if (this.express !== undefined) return Promise.resolve();
        this.express = express();
        this.server = http.createServer(this.express);
        return new Promise<void>(resolve => {
            this.server.listen(this.options.port, this.options.hostname, resolve);
        });
    }

    public stop(): Promise<void> {
        // can't stop it if it isn't started
        if (this.express === undefined) return Promise.resolve();
        return new Promise<void>(this.server.close.bind(this.server));
    }
}
