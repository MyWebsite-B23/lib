import {
    BatchGetItemCommand,
    BatchGetItemCommandInput,
    DeleteItemCommand,
    DeleteItemCommandInput,
    DynamoDBClient,
    ExecuteStatementCommand,
    ExecuteStatementCommandInput,
    GetItemCommand,
    GetItemCommandInput,
    PutItemCommand,
    PutItemCommandInput,
    QueryCommand,
    QueryCommandInput,
    ScanCommand,
    ScanCommandInput,
    TransactWriteItemsCommand,
    TransactWriteItemsCommandInput,
    UpdateItemCommand,
    UpdateItemCommandInput,
    AttributeValue,
    ReturnConsumedCapacity,
    ReturnValue,
    ReturnValuesOnConditionCheckFailure,
    ReturnItemCollectionMetrics,
    TransactWriteItem,
} from '@aws-sdk/client-dynamodb';

import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

type DynamoDBUtilityOptions = {
    region: string;
    returnItemCollectionMetrics?: ReturnItemCollectionMetrics | null;
    logCapacity?: boolean | null;
};

class DynamoDBUtility {
    private client: DynamoDBClient;
    private returnItemCollectionMetrics: ReturnItemCollectionMetrics;
    private logCapacity: boolean;
    private region: string;

    marshall = marshall;
    unmarshall = unmarshall;
    ReturnValue = ReturnValue;
    ReturnItemCollectionMetrics = ReturnItemCollectionMetrics;
    ReturnValuesOnConditionCheckFailure = ReturnValuesOnConditionCheckFailure;

    constructor({
        region,
        returnItemCollectionMetrics = ReturnItemCollectionMetrics.NONE,
        logCapacity = false
    }: DynamoDBUtilityOptions) {
        this.region = region;
        this.returnItemCollectionMetrics = returnItemCollectionMetrics ?? ReturnItemCollectionMetrics.NONE;
        this.logCapacity = logCapacity ?? false;
        this.client = new DynamoDBClient({ region: this.region });
    }

    private log(message: string, capacity: any, size?: any) {
        if (this.logCapacity) {
            console.log(message, 'Capacity:', capacity, 'Size:', size);
        }
    }

    /**
     * Puts (creates or replaces) an item into a DynamoDB table.
     * @param TableName - The name of the table.
     * @param item - The item object to put into the table.
     * @param condition - A condition expression that must be met for the put operation to succeed.
     * @param attributeName - Optional map of expression attribute names.
     * @param attributeValue - Optional map of expression attribute values used in the condition expression.
     * @param ReturnValues - Optional instruction on what values to return (e.g., NONE, ALL_OLD). Defaults to NONE.
     * @param ReturnValuesOnFailure - Optional instruction on what values to return if the condition check fails. Defaults to ALL_OLD.
     * @returns A promise that resolves to the unmarshalled attributes returned by the operation (based on ReturnValues), or an empty object.
     */
    async putItem(
        TableName: string,
        item: object,
        condition: string | null,
        attributeName?: Record<string, string> | null,
        attributeValue?: Record<string, AttributeValue> | null,
        ReturnValues: ReturnValue | null = ReturnValue.NONE,
        ReturnValuesOnFailure: ReturnValuesOnConditionCheckFailure | null = ReturnValuesOnConditionCheckFailure.ALL_OLD
    ) {
        const input: PutItemCommandInput = {
            TableName,
            Item: marshall(item, {
                removeUndefinedValues: true,
                convertClassInstanceToMap: true,
            }),
            ConditionExpression: condition ?? undefined,
            ExpressionAttributeNames: attributeName ?? undefined,
            ExpressionAttributeValues: attributeValue ?? undefined,
            ReturnValues: ReturnValues ?? ReturnValue.NONE,
            ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES,
            ReturnValuesOnConditionCheckFailure: ReturnValuesOnFailure ?? ReturnValuesOnConditionCheckFailure.ALL_OLD,
            ReturnItemCollectionMetrics: this.returnItemCollectionMetrics,
        };

        const command = new PutItemCommand(input);
        const result = await this.client.send(command);
        this.log('Put', result.ConsumedCapacity, result.ItemCollectionMetrics);
        return unmarshall(result.Attributes || {});
    }

    /**
     * Executes multiple write operations (Put, Update, Delete, ConditionCheck) as a single atomic transaction.
     * @param transactItems - An array of TransactWriteItem objects describing the operations. Keys and Put items will be automatically marshalled.
     * @returns A promise that resolves when the transaction completes. Throws an error if the transaction fails.
     */
    async transactWriteItems(transactItems: TransactWriteItem[]) {
        const input: TransactWriteItemsCommandInput = {
            TransactItems: transactItems.map((item) => {
                if (item.Put?.Item) {
                    item.Put.Item = marshall(item.Put.Item, {
                        removeUndefinedValues: true,
                        convertClassInstanceToMap: true,
                    });
                }
                if (item.Update?.Key) {
                    item.Update.Key = marshall(item.Update.Key);
                }
                if (item.Delete?.Key) {
                    item.Delete.Key = marshall(item.Delete.Key);
                }
                if (item.ConditionCheck?.Key) {
                    item.ConditionCheck.Key = marshall(item.ConditionCheck.Key);
                }
                return item;
            }),
            ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES,
            ReturnItemCollectionMetrics: this.returnItemCollectionMetrics,
        };

        const command = new TransactWriteItemsCommand(input);
        const result = await this.client.send(command);
        this.log('Transaction', result.ConsumedCapacity, result.ItemCollectionMetrics);
    }

    /**
     * Retrieves a single item from a DynamoDB table using its primary key.
     * @param TableName - The name of the table.
     * @param key - An object representing the primary key of the item to retrieve.
     * @param consistent - Optional flag for strongly consistent read. Defaults to false.
     * @param projection - Optional string specifying the attributes to retrieve (projection expression).
     * @param attributeName - Optional map of expression attribute names used in the projection expression.
     * @returns A promise that resolves to the unmarshalled item object, or an empty object if the item is not found.
     */
    async getItem(
        TableName: string,
        key: object,
        consistent: boolean | null = false,
        projection?: string | null,
        attributeName?: Record<string, string> | null
    ) {
        const input: GetItemCommandInput = {
            TableName,
            Key: marshall(key),
            ConsistentRead: consistent ?? false,
            ProjectionExpression: projection ?? undefined,
            ExpressionAttributeNames: attributeName ?? undefined,
            ReturnConsumedCapacity: ReturnConsumedCapacity.TOTAL,
        };

        const command = new GetItemCommand(input);
        const result = await this.client.send(command);
        this.log('Read', result.ConsumedCapacity);
        return unmarshall(result.Item || {});
    }

    /**
     * Retrieves multiple items from one or more tables in a batch operation. This implementation targets a single table.
     * @param TableName - The name of the table.
     * @param keys - An array of objects, each representing a primary key of an item to retrieve.
     * @param consistent - Optional flag for strongly consistent read for this table. Defaults to false.
     * @param projection - Optional string specifying the attributes to retrieve (projection expression).
     * @param attributeName - Optional map of expression attribute names used in the projection expression.
     * @returns A promise that resolves to an array of unmarshalled item objects found for the given keys.
     */
    async batchGetItem(
        TableName: string,
        keys: object[],
        consistent: boolean | null = false,
        projection?: string | null,
        attributeName?: Record<string, string> | null
    ) {
        const input: BatchGetItemCommandInput = {
            RequestItems: {
                [TableName]: {
                    Keys: keys.map((key) => marshall(key)),
                    ConsistentRead: consistent ?? false,
                    ProjectionExpression: projection ?? undefined,
                    ExpressionAttributeNames: attributeName ?? undefined,
                },
            },
            ReturnConsumedCapacity: ReturnConsumedCapacity.TOTAL,
        };

        const command = new BatchGetItemCommand(input);
        const result = await this.client.send(command);
        this.log('BatchRead', result.ConsumedCapacity);
        return result.Responses?.[TableName]?.map((item) => unmarshall(item)) || [];
    }

    /**
     * Queries items from a DynamoDB table or index based on a key condition expression.
     * @param TableName - The name of the table.
     * @param keyCondition - The key condition expression to filter items.
     * @param consistent - Optional flag for strongly consistent read. Defaults to false.
     * @param projection - Optional string specifying the attributes to retrieve (projection expression).
     * @param attributeName - Optional map of expression attribute names used in expressions.
     * @param attributeValue - Optional map of expression attribute values used in the key condition expression.
     * @param lastEvaluatedKey - Optional key from a previous query response to continue pagination.
     * @returns A promise that resolves to an object containing the array of unmarshalled items and the optional lastEvaluatedKey for pagination.
     */
    async queryItems(
        TableName: string,
        keyCondition: string,
        consistent: boolean | null = false,
        projection?: string | null,
        attributeName?: Record<string, string> | null,
        attributeValue?: Record<string, AttributeValue> | null,
        lastEvaluatedKey?: Record<string, AttributeValue> | null
    ) {
        const input: QueryCommandInput = {
            TableName,
            KeyConditionExpression: keyCondition,
            ExpressionAttributeValues: attributeValue ?? undefined,
            ConsistentRead: consistent ?? false,
            ProjectionExpression: projection ?? undefined,
            ExpressionAttributeNames: attributeName ?? undefined,
            ExclusiveStartKey: lastEvaluatedKey ?? undefined,
            ReturnConsumedCapacity: ReturnConsumedCapacity.TOTAL,
        };

        const command = new QueryCommand(input);
        const result = await this.client.send(command);

        this.log('Query', result.ConsumedCapacity);
        return {
            items: result.Items?.map((item) => unmarshall(item)) || [],
            lastEvaluatedKey: result.LastEvaluatedKey,
        };
    }

    /**
     * Scans (reads all items) a DynamoDB table or index, optionally filtering results. Use Scan operations judiciously.
     * @param TableName - The name of the table.
     * @param filterExpression - Optional filter expression to apply after the scan.
     * @param consistent - Optional flag for strongly consistent read. Defaults to false. Not recommended for scans.
     * @param projection - Optional string specifying the attributes to retrieve (projection expression).
     * @param attributeName - Optional map of expression attribute names used in expressions.
     * @param attributeValue - Optional map of expression attribute values used in the filter expression.
     * @param lastEvaluatedKey - Optional key from a previous scan response to continue pagination.
     * @returns A promise that resolves to an object containing the array of unmarshalled items and the optional lastEvaluatedKey for pagination.
     */
    async scanItems(
        TableName: string,
        filterExpression?: string | null,
        consistent: boolean | null = false,
        projection?: string | null,
        attributeName?: Record<string, string> | null,
        attributeValue?: Record<string, AttributeValue> | null,
        lastEvaluatedKey?: Record<string, AttributeValue> | null
    ) {
        const input: ScanCommandInput = {
            TableName,
            FilterExpression: filterExpression ?? undefined,
            ExpressionAttributeValues: attributeValue ?? undefined,
            ConsistentRead: consistent ?? false,
            ProjectionExpression: projection ?? undefined,
            ExpressionAttributeNames: attributeName ?? undefined,
            ExclusiveStartKey: lastEvaluatedKey ?? undefined,
            ReturnConsumedCapacity: ReturnConsumedCapacity.TOTAL,
        };

        const command = new ScanCommand(input);
        const result = await this.client.send(command);

        this.log('Scan', result.ConsumedCapacity);
        return {
            items: result.Items?.map((item) => unmarshall(item)) || [],
            lastEvaluatedKey: result.LastEvaluatedKey,
        };
    }

    /**
     * Executes a PartiQL statement against DynamoDB.
     * @param statement - The PartiQL statement string.
     * @param parameter - Optional array of AttributeValue parameters for the statement. Defaults to an empty array.
     * @param nextToken - Optional token from a previous PartiQL response to continue pagination.
     * @param consistent - Optional flag for strongly consistent read. Defaults to false.
     * @returns A promise that resolves to an object containing the array of unmarshalled items and optional nextToken/lastEvaluatedKey for pagination.
     */
    async partiQL(
        statement: string,
        parameter: AttributeValue[] | null = [],
        nextToken?: string | null,
        consistent: boolean | null = false
    ) {
        const input: ExecuteStatementCommandInput = {
            Statement: statement,
            Parameters: parameter ?? [],
            ConsistentRead: consistent ?? false,
            NextToken: nextToken ?? undefined,
            ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES,
        };

        const command = new ExecuteStatementCommand(input);
        const result = await this.client.send(command);
        this.log('PartiQL', result.ConsumedCapacity);
        return {
            Items: result.Items?.map((item) => unmarshall(item)) || [],
            nextToken: result.NextToken,
            lastEvaluatedKey: result.LastEvaluatedKey,
        };
    }

    /**
     * Updates an existing item in a DynamoDB table.
     * @param TableName - The name of the table.
     * @param key - An object representing the primary key of the item to update.
     * @param condition - A condition expression that must be met for the update operation to succeed.
     * @param update - An update expression specifying the attribute modifications.
     * @param attributeName - Optional map of expression attribute names used in expressions.
     * @param attributeValue - Optional map of expression attribute values used in expressions.
     * @param ReturnValues - Optional instruction on what values to return (e.g., NONE, ALL_OLD, UPDATED_NEW). Defaults to UPDATED_NEW.
     * @param ReturnValuesOnFailure - Optional instruction on what values to return if the condition check fails. Defaults to ALL_OLD.
     * @returns A promise that resolves to the unmarshalled attributes returned by the operation (based on ReturnValues), or an empty object.
     */
    async updateItem(
        TableName: string,
        key: object,
        condition: string | null,
        update: string,
        attributeName?: Record<string, string> | null,
        attributeValue?: Record<string, AttributeValue> | null,
        ReturnValues: ReturnValue | null = ReturnValue.UPDATED_NEW,
        ReturnValuesOnFailure: ReturnValuesOnConditionCheckFailure | null = ReturnValuesOnConditionCheckFailure.ALL_OLD
    ) {
        const input: UpdateItemCommandInput = {
            TableName,
            Key: marshall(key),
            ConditionExpression: condition ?? undefined,
            UpdateExpression: update,
            ExpressionAttributeNames: attributeName ?? undefined,
            ExpressionAttributeValues: attributeValue ?? undefined,
            ReturnValues: ReturnValues ?? ReturnValue.UPDATED_NEW,
            ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES,
            ReturnValuesOnConditionCheckFailure: ReturnValuesOnFailure ?? ReturnValuesOnConditionCheckFailure.ALL_OLD,
            ReturnItemCollectionMetrics: this.returnItemCollectionMetrics,
        };

        const command = new UpdateItemCommand(input);
        const result = await this.client.send(command);
        this.log('Update', result.ConsumedCapacity, result.ItemCollectionMetrics);
        return unmarshall(result.Attributes || {});
    }

    /**
     * Deletes a single item from a DynamoDB table using its primary key.
     * @param TableName - The name of the table.
     * @param key - An object representing the primary key of the item to delete.
     * @param condition - A condition expression that must be met for the delete operation to succeed.
     * @param attributeName - Optional map of expression attribute names used in the condition expression.
     * @param attributeValue - Optional map of expression attribute values used in the condition expression.
     * @param ReturnValues - Optional instruction on what values to return (e.g., NONE, ALL_OLD). Defaults to ALL_OLD.
     * @param ReturnValuesOnFailure - Optional instruction on what values to return if the condition check fails. Defaults to ALL_OLD.
     * @returns A promise that resolves to the unmarshalled attributes of the deleted item (based on ReturnValues), or an empty object.
     */
    async deleteItem(
        TableName: string,
        key: object,
        condition: string | null,
        attributeName?: Record<string, string> | null,
        attributeValue?: Record<string, AttributeValue> | null,
        ReturnValues: ReturnValue | null = ReturnValue.ALL_OLD,
        ReturnValuesOnFailure: ReturnValuesOnConditionCheckFailure | null = ReturnValuesOnConditionCheckFailure.ALL_OLD
    ) {
        const input: DeleteItemCommandInput = {
            TableName,
            Key: marshall(key),
            ConditionExpression: condition ?? undefined,
            ExpressionAttributeNames: attributeName ?? undefined,
            ExpressionAttributeValues: attributeValue ?? undefined,
            ReturnValues: ReturnValues ?? ReturnValue.ALL_OLD,
            ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES,
            ReturnValuesOnConditionCheckFailure: ReturnValuesOnFailure ?? ReturnValuesOnConditionCheckFailure.ALL_OLD,
            ReturnItemCollectionMetrics: this.returnItemCollectionMetrics,
        };

        const command = new DeleteItemCommand(input);
        const result = await this.client.send(command);
        this.log('Delete', result.ConsumedCapacity, result.ItemCollectionMetrics);
        return unmarshall(result.Attributes || {});
    }

    /**
     * Queries items from a DynamoDB secondary index based on a key condition expression.
     * @param TableName - The name of the table.
     * @param index - The name of the secondary index to query.
     * @param keyCondition - The key condition expression to filter items within the index.
     * @param consistent - Optional flag for strongly consistent read (only applicable if the index supports it). Defaults to false.
     * @param projection - Optional string specifying the attributes to retrieve (projection expression).
     * @param attributeName - Optional map of expression attribute names used in expressions.
     * @param attributeValue - Optional map of expression attribute values used in the key condition expression.
     * @param lastEvaluatedKey - Optional key from a previous query response to continue pagination.
     * @returns A promise that resolves to an object containing the array of unmarshalled items and the optional lastEvaluatedKey for pagination.
     */
    async getItemByIndex(
        TableName: string,
        index: string,
        keyCondition: string,
        consistent: boolean | null = false,
        projection?: string | null,
        attributeName?: Record<string, string> | null,
        attributeValue?: Record<string, AttributeValue> | null,
        lastEvaluatedKey?: Record<string, AttributeValue> | null
    ) {
        const input: QueryCommandInput = {
            TableName,
            IndexName: index,
            KeyConditionExpression: keyCondition,
            ExpressionAttributeValues: attributeValue ?? undefined,
            ExclusiveStartKey: lastEvaluatedKey ?? undefined,
            ConsistentRead: consistent ?? false,
            ProjectionExpression: projection ?? undefined,
            ExpressionAttributeNames: attributeName ?? undefined,
            ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES
        }

        const command = new QueryCommand(input);
        const result = await this.client.send(command);
        this.log("GetItemByIndex", result.ConsumedCapacity);
        return {
            Items: result.Items?.map(item => unmarshall(item)) || [],
            lastEvaluatedKey: result.LastEvaluatedKey,
        };
    }
}

export default DynamoDBUtility;
