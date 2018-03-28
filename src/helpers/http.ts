export default class HelperHTTP {
    public static readonly codes = {
        NotModified: 304,
        AccessDenied: 403,
        NotFound: 404,
        MissingParameters: 422,
        InternalError: 500
    };
}
