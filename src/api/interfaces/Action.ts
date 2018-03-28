import ActionParam from "./ActionParam";

export default interface Action {
    name: string;
    url: string;
    shouldGroupParams: boolean;
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    params: {[key: string]: ActionParam};
    [key: string]: any;
}
