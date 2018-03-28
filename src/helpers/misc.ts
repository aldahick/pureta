import * as path from "path";

export default class HelperMisc {
    public static get rootDir() { return path.dirname(require.main!.filename); }
    public static getFunctionParameterNames(func: Function): string[] {
        const names = func.toString().match(/\(([^\)]{0,})\)/)![1].split(",").map(i => i.trim());
        if (names.length === 1 && names[0] === "") return [];
        return names;
    }
}
