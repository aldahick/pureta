import * as crypto from "crypto";
import * as fs from "fs-extra";
import * as mime from "mime";
import HelperHTTP from "../helpers/http";
import RequestHandler from "../api/interfaces/RequestHandler";

export default class StaticRequestHandler extends RequestHandler {
    private filename: string;
    private fileStats: fs.Stats;
    private mimeType: string;
    public async handle(): Promise<void> {
        this.filename = this.app.assets[this.req.mvcPath];
        this.mimeType = mime.getType(this.req.mvcPath) || "text/plain";
        this.fileStats = await fs.stat(this.filename);
        if (this.mimeType === "video/mp4" && this.req.headers.range) {
            return this.streamVideo();
        }
        if (this.config.get("dev.enable")) {
            this.res.set({
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0"
            });
        } else if (this.mimeType !== "application/javascript" && this.mimeType !== "text/css") { // don't cache JS and CSS
            const hash: string = crypto.createHash("md5").update(new Buffer(this.filename + "-" + this.fileStats.mtime.getTime())).digest("hex");
            this.res.setHeader("Cache-Control", "max-age=" + 60 * 60 * 24 * 30); // 30 days
            this.res.setHeader("ETag", hash);
            if (this.req.header("If-None-Match") === hash) {
                this.res.sendStatus(HelperHTTP.codes.NotModified);
                return;
            }
        }
        this.res.set({
            "Content-Type": this.mimeType,
            "Content-Length": this.fileStats.size.toString()
        });
        fs.createReadStream(this.filename).pipe(this.res);
    }

    private streamVideo(): void {
        const range = <string>this.req.headers.range;
        const tokens = range.replace(/bytes=/, "").split("-");
        const start = Number(tokens[0]);
        const end = tokens[1] ? Number(tokens[1]) : this.fileStats.size - 1;
        const chunkSize = 1 + end - start;
        this.res.writeHead(206, {
            "Accept-Range": "bytes",
            "Content-Length": chunkSize,
            "Content-Range": `bytes ${start}-${end}/${this.fileStats.size}`,
            "Content-Type": this.mimeType
        });
        fs.createReadStream(this.filename, { start, end }).pipe(this.res);
    }
}
