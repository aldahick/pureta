import RequestHandler from "./interfaces/RequestHandler";

export default abstract class Controller extends RequestHandler {
    public abstract get route(): string;
}
