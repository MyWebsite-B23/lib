import SchemaDefinitions from './definition';
import TieredPriceSchema from './tieredPrice';

const Schema = {
  getStandardSchemaDefinition() {
    return SchemaDefinitions;
  },
  TieredPriceSchema,
}

export default Schema;
