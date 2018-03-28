import * as bodyParser from "body-parser";
import * as express from "express";
import * as http from "http";
import * as multer from "multer";
import Application from "./Application";
import GenericRequestHandler from "./request-handlers/generic";

export default class Server {
    public app: Application;
    public express: express.Application;
    public server: http.Server;
    public middleware: {[key: string]: express.Handler} = {};

    public constructor(app: Application) {
        this.app = app;
        this.express = express();
        this.server = http.createServer(this.express);
    }

    public async start(): Promise<void> {
        // don't want to start server if it's already started
        if (this.server.listening) return Promise.resolve();
        await this.app.emit("server:init");
        await this.setupMiddleware();
        this.express.all("/*", this.onRequest.bind(this));
        await new Promise<void>(resolve => {
            // TODO use config for port and hostname
            this.server.listen(3000, "0.0.0.0", resolve);
        });
    }

    public stop(): Promise<void> {
        // can't stop it if it isn't started
        if (!this.server.listening) return Promise.resolve();
        return new Promise<void>(this.server.close.bind(this.server));
    }

    private async setupMiddleware() {
        this.middleware.multer = multer({ // file uploads
            storage: multer.memoryStorage()
        }).any();
        this.middleware.bodyParser = bodyParser.urlencoded({ // POST bodies
            extended: true
        });
        await this.app.emit("server:middleware");
        Object.keys(this.middleware).forEach(m => {
            this.express.use(this.middleware[m]);
        });
    }

    private onRequest(req: express.Request, res: express.Response, next: express.NextFunction): void {
        new GenericRequestHandler({
            req, res, next,
            app: this.app
        }).handle().catch(err => this.app.logger.error(err));
    }
}
