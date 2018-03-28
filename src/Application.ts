/// <reference path="../def/promise-events.d.ts"/>
import "reflect-metadata";
import * as sourcemap from "source-map-support";
sourcemap.install();
import { EventEmitter } from "promise-events";
import * as fs from "fs-extra";
import * as path from "path";
import * as winston from "winston";
import PluginLoader from "./PluginLoader";
import Server from "./Server";

export default class Application extends EventEmitter {
    public logger: winston.LoggerInstance = <any>{};
    public plugins: {[key: string]: PluginLoader} = {};
    public server: Server = <any>{};

    public constructor() {
        super();
    }

    public async start(): Promise<void> {
        this.logger = await this.setupLogger();
        await this.loadPlugins();
        await this.emit("app:start");
        this.logger.info("Starting HTTP server...");
        await this.server.start();
    }

    public async stop(): Promise<void> {
        this.logger.info("Stopping Pureta...");
        return this.server.stop();
    }

    private async setupLogger(): Promise<winston.LoggerInstance> {
        const logDir = path.dirname(require.main!.filename) + "/logs";
        await fs.mkdirp(logDir);
        return new winston.Logger({
            transports: [
                new winston.transports.Console(),
                new winston.transports.File({
                    dirname: logDir
                })
            ]
        });
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
                this.logger.error("Found invalid metadata in plugin %s: %s", loader.baseDir, err.message);
                continue;
            }
            for (const pluginName of <string[]>loader.metadata.dependencies) {
                const pluginDir = baseDir + "/node_modules/" + pluginName;
                if (pluginLoaders.find(l => l.baseDir === pluginDir) || !await fs.pathExists(pluginDir)) continue;
                pluginLoaders.push(new PluginLoader(pluginDir));
            }
        }
        pluginLoaders = pluginLoaders.reverse().filter(loader => loader.isValid);
        this.logger.info("Found plugins: %j", pluginLoaders.map(l => l.metadata.name));
        await Promise.all(pluginLoaders.map(loader => loader.load(this)));
        pluginLoaders.forEach(p => this.plugins[p.metadata.name] = p);
    }
}
