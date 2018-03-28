import Action from "../interfaces/Action";

export default function(action: Partial<Action>): MethodDecorator {
    return Reflect.metadata("action", action);
}
