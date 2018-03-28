import { expect } from "chai";
import * as chokidar from "chokidar";
import * as events from "events";
import * as fs from "fs-extra";
import * as _ from "lodash";
import * as path from "path";
import HelperFS from "./helpers/fs";
import HelperMisc from "./helpers/misc";
import Action from "./api/interfaces/Action";
import ActionParam from "./api/interfaces/ActionParam";
import Application from "./Application";
import Controller from "./api/Controller";
import Plugin from "./api/Plugin";
import Route from "./api/interfaces/Route";
const requireReload: NodeRequire = require("require-reload");

export default class PluginLoader extends events.EventEmitter {
    public app: Application;
    public baseDir: string;
    public metadata: {
        name: string;
        main: string;
        dependencies: string[];
    } = <any>{};
    public plugin: Plugin = <any>{};
    public isValid = false;
    public isLoaded = false;
    /** {[key: url]: filename} */
    public assets: {[key: string]: string} = {};
    /** key: route URL */
    public routes: {[key: string]: Route} = {};
    /** {[key: url]: filename} */
    public views: {[key: string]: string} = {};

    public constructor(app: Application, baseDir: string) {
        super();
        this.app = app;
        this.baseDir = baseDir;
    }

    public async load(): Promise<void> {
        const pluginFilename: string = path.resolve(this.baseDir, this.metadata.main);
        if (!await fs.pathExists(pluginFilename)) throw new Error("Couldn't find plugin file " + pluginFilename);
        const PluginConstructor: new(app: Application) => Plugin = require(pluginFilename).default;
        this.plugin = new PluginConstructor(this.app);
        this.plugin.registerHandlers();
        Object.keys(this.plugin.dirs).forEach(key => {
            (<any>this.plugin.dirs)[key] = (<string[]>(<any>this.plugin.dirs)[key] || []).map(d => path.resolve(this.baseDir, d));
        });
        await Promise.all([
            this.loadAssets(),
            this.loadControllers(),
            this.loadViews()
        ]);
        this.setupWatchers();
        this.isLoaded = true;
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
        const files: string[] = await HelperFS.recursiveReaddirs(this.plugin.dirs.controller || []);
        files.forEach(this.loadController.bind(this));
    }

    private loadViews(): Promise<void[]> {
        return this.loadFlatDirs(this.plugin.dirs.view || [], "views", f => f.replace(/\.pug$/, ""));
    }

    private setupWatchers(): void {
        // TODO only if dev
        chokidar.watch(this.plugin.dirs.controller || [], {
            persistent: false
        }).on("change", (filename: string) => {
            const route = this.loadController(filename);
            if (route) {
                this.app.logger.info(`Reloaded controller: ${route.controller.prototype.constructor.name} (${route.url})`);
            }
        });
    }

    private loadController(filename: string): Route | undefined {
        if (!filename.endsWith(".js")) return undefined;
        const Controller: new() => Controller = (this.isLoaded ? requireReload : require)(filename).default;
        const controller = new Controller();
        let url = controller.route.toString();
        if (!url.startsWith("/")) url = "/" + url; // absolute url
        if (url.endsWith("/")) url = url.slice(0, -1); // remove trailing slash
        const actions: Action[] = Object.getOwnPropertyNames(Controller.prototype)
            .filter(k => k !== "constructor" && typeof(Controller.prototype[k]) === "function")
            .map(method => {
                const action: Partial<Action> = Reflect.getMetadata("action", controller, method) || {};
                if (action.url && !action.url.startsWith("/")) action.url = url + "/" + action.url;
                const params: {[key: string]: ActionParam} = {};
                const paramTypes: Function[] = Reflect.getMetadata("design:paramtypes", controller, method) || [];
                const optionalIndices: number[] = Reflect.getMetadata("optional", controller, method) || [];
                HelperMisc.getFunctionParameterNames((<any>controller)[method]).forEach((name, index) =>
                    params[name] = {
                        name,
                        type: paramTypes[index] || Object,
                        isRequired: !optionalIndices.includes(index)
                    });
                return _.defaults<Partial<Action>, Action>(action, {
                    name: method,
                    url: url + "/" + method,
                    method: "GET",
                    params,
                    shouldGroupParams: false
                });
            });
        const route: Route = {
            controller: Controller, url, actions
        };
        this.routes[route.url] = route;
        this.emit("load:route", route);
        return route;
     }

    private loadFlatDirs(dirs: string[], key: keyof PluginLoader, transform: (filename: string) => string = f => f): Promise<void[]> {
        return Promise.all(dirs.map(async dir => {
            const files: string[] = await HelperFS.recursiveReaddir(dir);
            for (const file of files) {
                const url = transform(file.substring(dir.length).replace(/\\/g, "/"));
                (<{[key: string]: string}>this[key])[url] = file;
            }
        }));
    }
}
