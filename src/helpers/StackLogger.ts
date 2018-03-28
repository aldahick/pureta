import * as stackTrace from "stack-trace";
import * as winston from "winston";

const STACK_LEVEL = 2;

export default class StackLogger extends winston.Logger {
    public stackDirs: {[key: string]: string} = {};
    /** changes to this variable only have effect on the next log() call */
    public stackLevel = 2;
    private stackSortedKeys: string[] = [];

    public constructor(options?: winston.LoggerOptions & {
        stackDirs: {[key: string]: string}
    }) {
        super(options);
        if (options) {
            this.stackDirs = options.stackDirs;
            this.generateStackKeys();
        }
    }

    public log: winston.LogMethod = (level: string, msg: string, ...meta: any[]): winston.LoggerInstance => {
        const stack = stackTrace.parse(new Error())[this.stackLevel];
        let filename = stack.getFileName().replace(/\\/g, "/");
        const stackKey = this.stackSortedKeys.find(k => filename.startsWith(this.stackDirs[k] + "/"));
        if (stackKey) {
            const stackDir = this.stackDirs[stackKey];
            filename = filename.substring(stackDir.length + 1);
        }
        msg = `[${stackKey} | ${filename}:${stack.getLineNumber()}] ${msg}`;
        this.stackLevel = STACK_LEVEL; // reset
        return super.log(level, msg, ...meta);
    };

    public generateStackKeys(): void {
        this.stackSortedKeys = Object.keys(this.stackDirs).sort((a, b) => this.stackDirs[b].length - this.stackDirs[a].length);
    }
}
