/// <reference path="../def/promise-events.d.ts"/>
import "reflect-metadata";
import * as sourcemap from "source-map-support";
sourcemap.install();
import { EventEmitter } from "promise-events";
import * as fs from "fs-extra";
import * as _ from "lodash";
import * as path from "path";
import * as util from "util";
import * as winston from "winston";
import PluginLoader from "./PluginLoader";
import Route from "./api/interfaces/Route";
import Server from "./Server";
import StackLogger from "./helpers/StackLogger";

export default class Application extends EventEmitter {
    public logger: StackLogger = <any>{};
    public plugins: {[key: string]: PluginLoader} = {};
    public server: Server = <any>{};

    public assets: {[key: string]: string} = {};
    public routes: {[key: string]: Route} = {};
    public views: {[key: string]: string} = {};

    public async start(): Promise<void> {
        this.logger = await this.setupLogger();
        await this.loadPlugins();
        Object.keys(this.plugins).forEach(k => this.logger.stackDirs[k] = fs.realpathSync(this.plugins[k].baseDir).replace(/\\/g, "/"));
        this.logger.generateStackKeys();
        await this.emit("app:start");
        this.server = new Server(this);
        await this.server.start();
        this.logger.info("Started HTTP server.");
    }

    public async stop(): Promise<void> {
        this.logger.info("Stopping Pureta...");
        return this.server.stop();
    }

    private async setupLogger(): Promise<StackLogger> {
        const logDir = path.dirname(require.main!.filename) + "/logs";
        await fs.mkdirp(logDir);
        const logger = new StackLogger({
            stackDirs: {
                "pureta": path.resolve(__dirname, "../src").replace(/\\/g, "/")
            },
            transports: [
                new winston.transports.Console({
                    formatter(options: {
                        timestamp: Date | false,
                        level: string,
                        message: string,
                        meta: {[key: string]: any}
                    }): string {
                        const level = winston.config.colorize(<any>options.level, options.level);
                        const message = Object.keys(options.meta).length ? util.format(options.message, options.meta) : options.message;
                        return `(${(options.timestamp || new Date()).toLocaleTimeString()}) [${level}] ${message}`;
                    }
                }),
                new winston.transports.File({
                    dirname: logDir
                })
            ]
        });
        return logger;
    }

    private async loadPlugins(): Promise<void> {
        const baseDir = path.dirname(require.main!.filename);
        let pluginLoaders: PluginLoader[] = [new PluginLoader(baseDir)];
        for (const loader of pluginLoaders) {
            const metadata = await fs.readJSON(loader.baseDir + "/package.json");
            loader.metadata = metadata.pureta;
            loader.metadata.name = metadata.name;
            try { loader.validateMetadata(); }
            catch (err) {
                this.logger.warn("Found invalid metadata in plugin %s: %s", loader.baseDir, err.message);
                continue;
            }
            for (const pluginName of <string[]>loader.metadata.dependencies) {
                const pluginDir = baseDir + "/node_modules/" + pluginName;
                if (pluginLoaders.find(l => l.baseDir === pluginDir)) continue;
                if (!await fs.pathExists(pluginDir)) {
                    this.logger.warn(`Couldn't resolve plugin ${pluginName} (from ${loader.metadata.name})`);
                    continue;
                }
                pluginLoaders.push(new PluginLoader(pluginDir));
            }
        }
        pluginLoaders = pluginLoaders.filter(loader => loader.isValid);
        this.logger.info("Found plugins: %s", pluginLoaders.map(l => l.metadata.name).sort().join(", "));
        await Promise.all(pluginLoaders.map(loader => loader.load(this)));
        pluginLoaders.forEach(p => {
            this.plugins[p.metadata.name] = p;
            this.assets = _.defaults(p.assets, this.assets);
            this.routes = _.defaults(p.routes, this.routes);
            this.views = _.defaults(p.views, this.views);
        });
    }
}
