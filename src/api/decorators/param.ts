export default class ParameterDecorators {
    static optional: ParameterDecorator = (target, propertyKey, parameterIndex) => {
        const optionalIndices: number[] = Reflect.hasMetadata("optional", target, propertyKey)
            ? Reflect.getMetadata("optional", target, propertyKey)
            : [];
        optionalIndices.push(parameterIndex);
        Reflect.defineMetadata("optional", optionalIndices, target, propertyKey);
    };
}
