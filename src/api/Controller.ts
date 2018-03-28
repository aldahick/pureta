import Application from "../Application";
import DeepPartial from "./interfaces/DeepPartial";

export default abstract class Controller {
    protected app: Application;

    public constructor(app: Application, partial: DeepPartial<Controller>) {
        Object.assign(this, partial);
        this.app = app;
    }

    public abstract get route(): string;
}
