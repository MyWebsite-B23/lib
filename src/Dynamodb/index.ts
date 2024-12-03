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

class DynamoDBUtility {
    private client: DynamoDBClient;
    private returnItemCollectionMetrics: ReturnItemCollectionMetrics;
    private logCapacity: boolean;
    private region: string;

    constructor({ region, returnItemCollectionMetrics = ReturnItemCollectionMetrics.NONE, logCapacity = false}: { region: string, returnItemCollectionMetrics: ReturnItemCollectionMetrics, logCapacity: boolean}) {
        this.region = region;
        this.returnItemCollectionMetrics = returnItemCollectionMetrics;
        this.logCapacity = logCapacity;
        this.client = new DynamoDBClient({ region: this.region });
    }

    private log(message: string, capacity: any, size?: any) {
        if (this.logCapacity) {
            console.log(message, 'Capacity:', capacity, 'Size:', size);
        }
    }

    async putItem(
        TableName: string,
        item: object,
        condition: string,
        attributeName?: Record<string, string>,
        attributeValue?: Record<string, AttributeValue>,
        ReturnValues: ReturnValue = ReturnValue.NONE,
        ReturnValuesOnFailure: ReturnValuesOnConditionCheckFailure = ReturnValuesOnConditionCheckFailure.ALL_OLD
    ) {
        const input: PutItemCommandInput = {
            TableName,
            Item: marshall(item, {
                removeUndefinedValues: true,
                convertClassInstanceToMap: true,
            }),
            ConditionExpression: condition,
            ExpressionAttributeNames: attributeName,
            ExpressionAttributeValues: attributeValue,
            ReturnValues,
            ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES,
            ReturnValuesOnConditionCheckFailure: ReturnValuesOnFailure,
            ReturnItemCollectionMetrics: this.returnItemCollectionMetrics,
        };

        const command = new PutItemCommand(input);
        const result = await this.client.send(command);
        this.log('Put', result.ConsumedCapacity, result.ItemCollectionMetrics);
        return unmarshall(result.Attributes || {});
    }

    async transactWriteItems(transactItems: TransactWriteItem[]) {
        const input: TransactWriteItemsCommandInput = {
            TransactItems: transactItems.map((item) => {
                if (item.Put) {
                    item.Put.Item = marshall(item.Put.Item, {
                        removeUndefinedValues: true,
                        convertClassInstanceToMap: true,
                    });
                }
                if (item.Update) {
                    item.Update.Key = marshall(item.Update.Key);
                }
                if (item.Delete) {
                    item.Delete.Key = marshall(item.Delete.Key);
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

    async getItem(
        TableName: string,
        key: object,
        consistent: boolean = false,
        projection?: string,
        attributeName?: Record<string, string>
    ) {
        const input: GetItemCommandInput = {
            TableName,
            Key: marshall(key),
            ConsistentRead: consistent,
            ProjectionExpression: projection,
            ExpressionAttributeNames: attributeName,
            ReturnConsumedCapacity: ReturnConsumedCapacity.TOTAL,
        };

        const command = new GetItemCommand(input);
        const result = await this.client.send(command);
        this.log('Read', result.ConsumedCapacity);
        return unmarshall(result.Item || {});
    }

    async batchGetItem(
        TableName: string,
        keys: object[],
        consistent: boolean = false,
        projection?: string,
        attributeName?: Record<string, string>
    ) {
        const input: BatchGetItemCommandInput = {
            RequestItems: {
                [TableName]: {
                    Keys: keys.map((key) => marshall(key)),
                    ConsistentRead: consistent,
                    ProjectionExpression: projection,
                    ExpressionAttributeNames: attributeName,
                },
            },
            ReturnConsumedCapacity: ReturnConsumedCapacity.TOTAL,
        };

        const command = new BatchGetItemCommand(input);
        const result = await this.client.send(command);
        this.log('BatchRead', result.ConsumedCapacity);
        return result.Responses?.[TableName]?.map((item) => unmarshall(item)) || [];
    }

    async queryItems(
        TableName: string,
        keyCondition: string,
        consistent: boolean = false,
        projection?: string,
        attributeName?: Record<string, string>,
        attributeValue?: Record<string, AttributeValue>,
        lastEvaluatedKey?: Record<string, AttributeValue>
    ) {
        const input: QueryCommandInput = {
            TableName,
            KeyConditionExpression: keyCondition,
            ExpressionAttributeValues: attributeValue,
            ConsistentRead: consistent,
            ProjectionExpression: projection,
            ExpressionAttributeNames: attributeName,
            ExclusiveStartKey: lastEvaluatedKey,
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

    async scanItems(
        TableName: string,
        filterExpression?: string,
        consistent: boolean = false,
        projection?: string,
        attributeName?: Record<string, string>,
        attributeValue?: Record<string, AttributeValue>,
        lastEvaluatedKey?: Record<string, AttributeValue>
    ) {
        const input: ScanCommandInput = {
            TableName,
            FilterExpression: filterExpression,
            ExpressionAttributeValues: attributeValue,
            ConsistentRead: consistent,
            ProjectionExpression: projection,
            ExpressionAttributeNames: attributeName,
            ExclusiveStartKey: lastEvaluatedKey,
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

    async partiQL(
        statement: string,
        parameter: AttributeValue[] = [],
        nextToken?: string,
        consistent: boolean = false
    ) {
        const input: ExecuteStatementCommandInput = {
            Statement: statement,
            Parameters: parameter,
            ConsistentRead: consistent,
            NextToken: nextToken,
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

    async updateItem(
        TableName: string,
        key: object,
        condition: string,
        update: string,
        attributeName?: Record<string, string>,
        attributeValue?: Record<string, AttributeValue>,
        ReturnValues: ReturnValue = ReturnValue.UPDATED_NEW,
        ReturnValuesOnFailure: ReturnValuesOnConditionCheckFailure = ReturnValuesOnConditionCheckFailure.ALL_OLD
    ) {
        const input: UpdateItemCommandInput = {
            TableName,
            Key: marshall(key),
            ConditionExpression: condition,
            UpdateExpression: update,
            ExpressionAttributeNames: attributeName,
            ExpressionAttributeValues: attributeValue,
            ReturnValues,
            ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES,
            ReturnValuesOnConditionCheckFailure: ReturnValuesOnFailure,
            ReturnItemCollectionMetrics: this.returnItemCollectionMetrics,
        };

        const command = new UpdateItemCommand(input);
        const result = await this.client.send(command);
        this.log('Update', result.ConsumedCapacity, result.ItemCollectionMetrics);
        return unmarshall(result.Attributes || {});
    }

    async deleteItem(
        TableName: string,
        key: object,
        condition: string,
        attributeName?: Record<string, string>,
        attributeValue?: Record<string, AttributeValue>,
        ReturnValues: ReturnValue = ReturnValue.ALL_OLD,
        ReturnValuesOnFailure: ReturnValuesOnConditionCheckFailure = ReturnValuesOnConditionCheckFailure.ALL_OLD
    ) {
        const input: DeleteItemCommandInput = {
            TableName,
            Key: marshall(key),
            ConditionExpression: condition,
            ExpressionAttributeNames: attributeName,
            ExpressionAttributeValues: attributeValue,
            ReturnValues,
            ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES,
            ReturnValuesOnConditionCheckFailure: ReturnValuesOnFailure,
            ReturnItemCollectionMetrics: this.returnItemCollectionMetrics,
        };

        const command = new DeleteItemCommand(input);
        const result = await this.client.send(command);
        this.log('Delete', result.ConsumedCapacity, result.ItemCollectionMetrics);
        return unmarshall(result.Attributes || {});
    }

    async getItemByIndex(
        TableName: string, 
        index: string, 
        keyCondition: string, 
        consistent: boolean = false, 
        projection?: string, 
        attributeName?: Record<string, string>, 
        attributeValue?:  Record<string, AttributeValue>
    ) {
        const input: QueryCommandInput = {
            TableName,
            IndexName: index,
            KeyConditionExpression: keyCondition,
            ExpressionAttributeValues: attributeValue,
            ConsistentRead: consistent,
            ProjectionExpression: projection,
            ExpressionAttributeNames: attributeName,
            ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES
        }
    
        const command = new QueryCommand(input);
        const result = await this.client.send(command);
        this.log("Query", result.ConsumedCapacity);
        return { Items: result.Items?.map(item => unmarshall(item)) || [] };
    }
}

export default DynamoDBUtility;
