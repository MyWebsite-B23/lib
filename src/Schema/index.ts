import SchemaDefinitions from './definition';
import TieredPriceSchemaDefinitions from './tieredPrice';

const Schema = {
  getStandardSchemaDefinition() {
    return SchemaDefinitions;
  },
  getTieredPriceSchemaDefinition() {
    return TieredPriceSchemaDefinitions;
  },
}

export default Schema;
