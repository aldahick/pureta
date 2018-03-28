declare namespace Express {
    export interface Request {
        baseUrl: string;
        fullUrl: string;
        mvcPath: string;
        mvcFullPath: string;
    }
}
