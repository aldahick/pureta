import RequestHandler from "../api/interfaces/RequestHandler";
import DynamicRequestHandler from "./dynamic";
import StaticRequestHandler from "./static";

export default class GenericRequestHandler extends RequestHandler {
    public async handle(): Promise<void> {
        this.setupExpressObjects();
        const assetFilename = await this.getAssetFile();
        const Handler = assetFilename ? StaticRequestHandler : DynamicRequestHandler;
        try {
            await new Handler(this).handle();
        } catch (err) {
            if (!isNaN(Number(err.message))) await this.renderError(Number(err.message));
            else throw err;
        }
    }

    private setupExpressObjects(): void {
        this.req.mvcPath = decodeURIComponent(this.req.path);
        // ensure there's always an action
        if (this.req.mvcPath.endsWith("/")) this.req.mvcPath += "index";
        this.req.mvcFullPath = this.req.mvcPath;
        if (this.req.originalUrl.includes("?")) {
            this.req.mvcFullPath += "?" + this.req.originalUrl.split("?").slice(-1)[0];
        }
        const host = this.config.get("http.host") + ":" + this.req.get("host")!.split(":")[1];
        this.req.baseUrl = this.req.protocol + "://" + host + "/";
        this.req.fullUrl = this.req.baseUrl + this.req.mvcPath.substring(1);
        const pathTokens = this.req.mvcPath.split("/");
        this.path = {
            action: pathTokens.splice(-1, 1)[0],
            route: pathTokens.join("/")
        };
        // TODO handle view metadata(?)
    }

    private async getAssetFile(): Promise<string | undefined> {
        const filename: string = this.app.assets[this.req.mvcPath];
        if (filename) return filename;
        return undefined;
    }

    private async renderError(code: number) {
        await this.app.emit("request:error", this, code);
        if (this.res.finished) return;
        this.res.statusCode = code;
        this.res.send("Request could not be processed: HTTP code " + code);
    }
}
