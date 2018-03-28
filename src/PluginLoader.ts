import { expect } from "chai";
import * as fs from "fs-extra";
import * as path from "path";
import Application from "./Application";
import Controller from "./api/Controller";
import Plugin from "./api/Plugin";
import HelperFS from "./helpers/fs";

export default class PluginLoader {
    public baseDir: string;
    public metadata: {
        name: string;
        main: string;
        dependencies: string[];
    } = <any>{};
    public plugin: Plugin = <any>{};
    public isValid = false;
    /** {[key: url]: filename} */
    public assets: {[key: string]: string} = {};
    /** key: route */
    public controllers: {[key: string]: typeof Controller} = {};
    /** {[key: url]: filename} */
    public views: {[key: string]: string} = {};

    public constructor(baseDir: string) {
        this.baseDir = baseDir;
    }

    public async load(app: Application): Promise<void> {
        const pluginFilename: string = path.resolve(this.baseDir, this.metadata.main);
        if (!await fs.pathExists(pluginFilename)) throw new Error("Couldn't find plugin file " + pluginFilename);
        const PluginConstructor: new(app: Application) => Plugin = require(pluginFilename).default;
        this.plugin = new PluginConstructor(app);
        this.plugin.registerHandlers();
        Object.keys(this.plugin.dirs).forEach(key => {
            (<any>this.plugin.dirs)[key] = (<string[]>(<any>this.plugin.dirs)[key] || []).map(d => path.resolve(this.baseDir, d));
        });
        await Promise.all([
            this.loadAssets(),
            this.loadControllers(),
            this.loadViews()
        ]);
        app.logger.info("assets: %o", this.assets);
        this.setupWatchers();
    }

    public validateMetadata(): void {
        expect(this.metadata).to.be.an("object");
        expect(this.metadata.name).to.be.a("string");
        expect(this.metadata.main).to.be.a("string");
        expect(this.metadata.dependencies).to.be.instanceof(Array);
        this.isValid = true;
    }

    private loadAssets(): Promise<void[]> {
        return this.loadFlatDirs(this.plugin.dirs.asset || [], "assets");
    }

    private async loadControllers(): Promise<void> {
        // const files: string[] = await HelperFS.recursiveReaddirs(this.plugin.dirs.controller || []);
    }

    private loadViews(): Promise<void[]> {
        return this.loadFlatDirs(this.plugin.dirs.view || [], "views");
    }

    private setupWatchers(): void {

    }

    private loadFlatDirs(dirs: string[], key: keyof PluginLoader): Promise<void[]> {
        return Promise.all(dirs.map(async dir => {
            const files: string[] = await HelperFS.recursiveReaddir(dir);
            for (const file of files) {
                const url = file.substring(dir.length).replace(/\\/g, "/");
                (<{[key: string]: string}>this[key])[url] = file;
            }
        }));
    }
}
