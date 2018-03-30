import * as bodyParser from "body-parser";
import * as express from "express";
import * as http from "http";
import * as multer from "multer";
import Application from "./Application";
import GenericRequestHandler from "./request-handlers/generic";

export default class Server {
    public app: Application;
    public express: express.Application;
    public server: http.Server | undefined;
    public middleware: {[key: string]: express.Handler} = {};

    public constructor(app: Application) {
        this.app = app;
        this.express = express();
    }

    public async start(): Promise<number> {
        // don't want to start server if it's already started
        if (this.server !== undefined) return -1;
        await this.app.emit("server:init");
        await this.setupMiddleware();
        this.express.use(this.onRequest.bind(this));
        return await this.startHttpServer();
    }

    public stop(): Promise<void> {
        // can't stop it if it isn't started
        if (this.server === undefined) return Promise.resolve();
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

    private startHttpServer(): Promise<number> {
        this.server = http.createServer(this.express);
        const port: number = this.app.configs.global.get("http.port") || 3000;
        return new Promise<number>(resolve => {
            this.server!.listen(port, "0.0.0.0", () => resolve(port));
        });
    }

    private onRequest(req: express.Request, res: express.Response, next: express.NextFunction): void {
        const config = this.app.configs[req.hostname];
        if (!config) {
            this.app.logger.error(`Ignoring request to ${req.hostname}${req.path}: couldn't find configs`);
            res.sendStatus(404);
            return;
        }
        const oldSend = res.send.bind(res);
        res.send = function(body?: any) {
            const ret = oldSend(body);
            this.write("\n");
            this.finished = true;
            this.connection.end();
            return ret;
        };
        new GenericRequestHandler({
            req, res, next, config,
            app: this.app
        }).handle().catch(err => {
            this.app.logger.error(err, err);
        });
    }
}
