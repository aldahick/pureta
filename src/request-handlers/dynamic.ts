import * as fs from "fs-extra";
import Action from "../api/interfaces/Action";
import Controller from "../api/Controller";
import HelperHTTP from "../helpers/http";
import RequestHandler from "../api/interfaces/RequestHandler";
import Route from "../api/interfaces/Route";

export default class DynamicRequestHandler extends RequestHandler {
    private route: Route | undefined;
    private controller: Controller | undefined;
    private action: Action | undefined;
    public async handle(): Promise<void> {
        this.route = this.app.routes[this.path.route];
        if (this.route) {
            this.controller = new (<any>this.route.controller)(this);
            this.action = this.route.actions.find(a => a.url === this.req.mvcPath && a.method === this.req.method);
        }
        await this.app.emit("request", this);
        if (this.res.finished) return;
        if (!(this.controller && this.action)) {
            return await this.serveView();
        }
        if (await this.callController()) {
            this.serveView();
        }
    }

    private async callController(): Promise<void> {
        const queryParams = this.buildQueryParams();
        if (!queryParams) {
            throw new Error(HelperHTTP.codes.MissingParameters.toString());
        }
        let result: any;
        try {
            result = await (<any>this.controller!)[this.action!.name].apply(this.controller, queryParams);
        } catch (err) {
            this.app.logger.error(err);
            throw new Error(HelperHTTP.codes.InternalError.toString());
        }
        if (this.res.finished) return;
        if (this.res.statusCode !== 200) throw new Error(this.res.statusCode.toString());
        if (result === undefined) return await this.serveView();
        let value: string | Buffer = result;
        if (!(typeof(result) === "string" || result instanceof Buffer)) {
            value = JSON.stringify(result);
            this.res.set("Content-Type", "application/json");
        }
        this.res.send(value);
    }

    private async serveView(): Promise<void> {
        const filename = this.app.views[this.req.mvcPath];
        if (!(filename && await fs.pathExists(filename))) throw new Error(HelperHTTP.codes.NotFound.toString());
        await this.app.emit("request:responding", this);
        if (this.res.finished) return;
        let html: string;
        try {
            html = await new Promise<string>((resolve, reject) => {
                this.res.render(filename, this.res.locals, (err, html) => {
                    if (err) reject(err);
                    else resolve(html);
                });
            });
        } catch (err) {
            this.app.logger.error(`Rendering ${filename} failed: ${err.message}`);
            throw new Error(HelperHTTP.codes.InternalError.toString());
        }
        await this.app.emit("request:responded", this);
        this.res.send(html);
    }

    private buildQueryParams(): any[] | undefined {
        return [];
    }
}
