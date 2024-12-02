import DynamoDB from './Dynamodb/util';
import  SchemaDefinitions from './Schema/definition.json';

export const getStandardSchemaDefinition = () => {
  return SchemaDefinitions;
}

export  { DynamoDB };
