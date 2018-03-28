import { expect } from "chai";
import * as fs from "fs-extra";
import * as path from "path";
import Application from "./Application";
import Controller from "./api/Controller";
import Plugin from "./api/Plugin";

export default class PluginLoader {
    public baseDir: string;
    public metadata: {
        name: string;
        main: string;
        dependencies: string[];
    };
    public plugin: Plugin;
    public isValid = false;
    /** {[key: url]: filename} */
    public assets: {[key: string]: string} = {};
    /** key: route */
    public controllers: {[key: string]: typeof Controller} = {};
    /** {[key: url]: filename} */
    public views: {[key: string]: string};

    public constructor(baseDir: string) {
        this.baseDir = baseDir;
    }

    public async load(app: Application): Promise<Plugin> {
        const pluginFilename: string = path.resolve(this.baseDir, this.metadata.main);
        if (!await fs.pathExists(pluginFilename)) throw new Error("Couldn't find plugin file " + pluginFilename);
        const PluginConstructor: new(app: Application) => Plugin = require(pluginFilename).default;
        this.plugin = new PluginConstructor(app);
        this.plugin.registerHandlers();
        return undefined;
    }

    public validateMetadata(): void {
        expect(this.metadata).to.be.an("object");
        expect(this.metadata.name).to.be.a("string");
        expect(this.metadata.main).to.be.a("string");
        expect(this.metadata.dependencies).to.be.instanceof(Array);
        this.isValid = true;
    }

    private loadAssets(): Promise<void[]> {
        return Promise.all(this.plugin.dirs.asset.map(async dir => {
            // const files: string[] = HelperFS
        }));
    }

    private loadControllers(): Promise<void> {

    }

    private loadViews(): Promise<void> {

    }
}
