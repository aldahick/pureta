import Action from "./Action";
import Controller from "../Controller";

export default interface Route {
    url: string;
    actions: Action[];
    controller: typeof Controller;
}
