import  SchemaDefinitions from './Schema/definition.json';
export * from './Dynamodb/util';

export const getStandardSchemaDefinition = () => {
  return SchemaDefinitions;
}
