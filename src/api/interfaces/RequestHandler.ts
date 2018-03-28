import * as express from "express";
import Application from "../../Application";
import Configuration from "../../Configuration";
import DeepPartial from "./DeepPartial";

export default abstract class RequestHandler {
    public app: Application;
    public config: Configuration;
    public req: express.Request = <any>{};
    public res: express.Response = <any>{};
    public next: express.NextFunction = () => { };
    public path: {
        route: string;
        action: string;
    } = <any>{};

    public constructor(init: DeepPartial<RequestHandler>) {
        Object.assign(this, init);
    }
}
