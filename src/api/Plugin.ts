import Application from "../Application";

export default abstract class Plugin {
    protected app: Application;

    public constructor(app: Application) {
        this.app = app;
    }

    /**
     * Should all be relative paths
     */
    public abstract dirs: {
        asset?: string[] | undefined;
        controller?: string[] | undefined;
        model?: string[] | undefined;
        view?: string[] | undefined;
    };
    public abstract registerHandlers(): void;
}
