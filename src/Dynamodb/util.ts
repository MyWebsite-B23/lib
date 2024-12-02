import { BatchGetItemCommand, BatchGetItemCommandInput, DeleteItemCommand, DeleteItemCommandInput, DynamoDBClient, ExecuteStatementCommand, ExecuteStatementCommandInput, GetItemCommand, GetItemCommandInput, PutItemCommand, PutItemCommandInput, QueryCommand, QueryCommandInput, ScanCommand, ScanCommandInput, TransactWriteItem, TransactWriteItemsCommand, TransactWriteItemsCommandInput, UpdateItemCommand, UpdateItemCommandInput} from '@aws-sdk/client-dynamodb';
import { AttributeValue, ReturnConsumedCapacity, ReturnValue, ReturnValuesOnConditionCheckFailure} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

const client = new DynamoDBClient({ region: 'ap-south-1'});

var process: any;

export async function putItem(TableName: string, item: object, condition: string, attributeName?: Record<string, string>, attributeValue?:  Record<string, AttributeValue>, ReturnValues: ReturnValue = ReturnValue.NONE, ReturnValuesOnFailure: ReturnValuesOnConditionCheckFailure = ReturnValuesOnConditionCheckFailure.ALL_OLD) {
    const input: PutItemCommandInput = {
        TableName,
        Item: marshall(item, {
            removeUndefinedValues: true,
            convertClassInstanceToMap: true
        }),
        ConditionExpression: condition,
        ExpressionAttributeNames: attributeName,
        ExpressionAttributeValues: attributeValue,
        ReturnValues,
        ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES,
        ReturnValuesOnConditionCheckFailure: ReturnValuesOnFailure,
        ReturnItemCollectionMetrics: process.env.RETURN_ITEM_COLLECTION_METRICS
    }

    const command = new PutItemCommand(input);
    const result = await client.send(command);
    process.env.UTIL_LOG && console.log("Put", result);
    return unmarshall(result.Attributes || {});
}

export async function transactWriteItems(transactItems: TransactWriteItem[]) {
    const input: TransactWriteItemsCommandInput = {
        TransactItems: transactItems.map(item => {
            if (item.Put) {
                item.Put.Item = marshall(item.Put.Item, {
                    removeUndefinedValues: true,
                    convertClassInstanceToMap: true
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
        ReturnItemCollectionMetrics: process.env.RETURN_ITEM_COLLECTION_METRICS,
    };

    const command = new TransactWriteItemsCommand(input);
    const result = await client.send(command);
    process.env.UTIL_LOG && console.log("Transaction", result.ConsumedCapacity);
}

export async function getItem(TableName: string, key: object, consistent: boolean = false, projection?: string, attributeName?: Record<string, string>){
    const input: GetItemCommandInput = {
        TableName,
        Key: marshall(key),
        ConsistentRead: consistent,
        ProjectionExpression: projection,
        ExpressionAttributeNames: attributeName,
        ReturnConsumedCapacity: ReturnConsumedCapacity.TOTAL
    }

    const command = new GetItemCommand(input);
    const result = await client.send(command);
    process.env.UTIL_LOG && console.log("Read", result.ConsumedCapacity);
    return unmarshall(result.Item || {});
}

export async function batchGetItem(TableName: string, keys: object[], consistent: boolean = false, projection?: string, attributeName?: Record<string, string>) {
    const input: BatchGetItemCommandInput = {
        RequestItems: {
            [TableName]: {
                Keys: keys.map(key => marshall(key)),
                ConsistentRead: consistent,
                ProjectionExpression: projection,
                ExpressionAttributeNames: attributeName,
            },
        },
        ReturnConsumedCapacity: ReturnConsumedCapacity.TOTAL
    }

    const command = new BatchGetItemCommand(input);
    const result = await client.send(command);
    process.env.UTIL_LOG && console.log("BatchRead", result.ConsumedCapacity);
    return result.Responses?.[TableName]?.map(item => unmarshall(item)) || [];
}

export async function queryItems(TableName: string, keyCondition: string, consistent: boolean = false, projection?: string, attributeName?: Record<string, string>, attributeValue?:  Record<string, AttributeValue>, lastEvaluatedKey?: Record<string, AttributeValue>) {
    const input: QueryCommandInput = {
        TableName,
        KeyConditionExpression: keyCondition,
        ExpressionAttributeValues: attributeValue,
        ConsistentRead: consistent,
        ProjectionExpression: projection,
        ExpressionAttributeNames: attributeName,
        ExclusiveStartKey: lastEvaluatedKey,
        ReturnConsumedCapacity: ReturnConsumedCapacity.TOTAL
    };

    const command = new QueryCommand(input);
    const result = await client.send(command);

    process.env.UTIL_LOG && console.log("Query", result.ConsumedCapacity);
    return {
        items: result.Items?.map(item => unmarshall(item)) || [],
        lastEvaluatedKey: result.LastEvaluatedKey
    };
}

export async function scanItems(TableName: string, filterExpression?: string, consistent: boolean = false, projection?: string, attributeName?: Record<string, string>, attributeValue?: Record<string, AttributeValue>, lastEvaluatedKey?: Record<string, AttributeValue>) {
    const input: ScanCommandInput = {
        TableName,
        FilterExpression: filterExpression,
        ExpressionAttributeValues: attributeValue,
        ConsistentRead: consistent,
        ProjectionExpression: projection,
        ExpressionAttributeNames: attributeName,
        ExclusiveStartKey: lastEvaluatedKey,
        ReturnConsumedCapacity: ReturnConsumedCapacity.TOTAL
    };

    const command = new ScanCommand(input);
    const result = await client.send(command);

    process.env.UTIL_LOG && console.log("Scan", result.ConsumedCapacity);
    return {
        items: result.Items?.map(item => unmarshall(item)) || [],
        lastEvaluatedKey: result.LastEvaluatedKey
    }
}

export async function partiQL(statement: string, parameter: AttributeValue[] = [], nextToken?: string, consistent: boolean = false) {
    const input: ExecuteStatementCommandInput = {
        Statement: statement,
        Parameters: parameter,
        ConsistentRead: consistent,
        NextToken: nextToken,
        ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES
    }

    const command = new ExecuteStatementCommand(input);
    const result = await client.send(command);
    process.env.UTIL_LOG && console.log("PartiQL", result.ConsumedCapacity)
    return {
        Items: result.Items?.map(item => unmarshall(item)) || [],
        nextToken: result.NextToken,
        lastEvaluatedKey: result.LastEvaluatedKey
    };
}

export async function updateItem(TableName: string, key: object, condition: string, update: string, attributeName?: Record<string, string>, attributeValue?:  Record<string, AttributeValue>, ReturnValues: ReturnValue = ReturnValue.UPDATED_NEW, ReturnValuesOnFailure: ReturnValuesOnConditionCheckFailure = ReturnValuesOnConditionCheckFailure.ALL_OLD) {
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
        ReturnItemCollectionMetrics: process.env.RETURN_ITEM_COLLECTION_METRICS
    }

    const command = new UpdateItemCommand(input);
    const result = await client.send(command);
    process.env.UTIL_LOG && console.log("Update", result)
    return unmarshall(result.Attributes || {});
}

export async function deleteItem(TableName: string, key: object, condition: string, attributeName?: Record<string, string>, attributeValue?:  Record<string, AttributeValue>, ReturnValues: ReturnValue = ReturnValue.ALL_OLD, ReturnValuesOnFailure: ReturnValuesOnConditionCheckFailure = ReturnValuesOnConditionCheckFailure.ALL_OLD) {
    const input: DeleteItemCommandInput = {
        TableName,
        Key: marshall(key),
        ConditionExpression: condition,
        ExpressionAttributeNames: attributeName,
        ExpressionAttributeValues: attributeValue,
        ReturnValues,
        ReturnConsumedCapacity: ReturnConsumedCapacity.INDEXES,
        ReturnValuesOnConditionCheckFailure: ReturnValuesOnFailure,
        ReturnItemCollectionMetrics: process.env.RETURN_ITEM_COLLECTION_METRICS
    }

    const command = new DeleteItemCommand(input);
    const result = await client.send(command);
    process.env.UTIL_LOG && console.log("Delete", result)
    return unmarshall(result.Attributes || {});
}

export async function getItemByIndex(TableName: string, index: string, keyCondition: string, consistent: boolean = false, projection?: string, attributeName?: Record<string, string>, attributeValue?:  Record<string, AttributeValue>) {
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
    const result = await client.send(command);
    process.env.UTIL_LOG && console.log("Query", result.ConsumedCapacity)
    return { Items: result.Items?.map(item => unmarshall(item)) || [] };
}


export { marshall };

const DynamoDB = {
    marshall,
    unmarshall,
    putItem,
    transactWriteItems,
    getItem,
    batchGetItem,
    queryItems,
    scanItems,
    partiQL,
    updateItem,
    deleteItem,
    getItemByIndex
}

export default DynamoDB;