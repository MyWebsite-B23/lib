import  SchemaDefinitions from './Schema/definition.json';
import DynamoDB from './Dynamodb/util';

export const getStandardSchemaDefinition = () => {
  return SchemaDefinitions;
}

export  { DynamoDB }
