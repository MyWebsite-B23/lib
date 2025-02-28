# util-lib

## Overview

This library provides a set of utilities and classes for various functionalities including authentication, DynamoDB operations, schema validation, logging, and more.

## Installation

To install the library, run:

```sh
npm install b23-lib
```

## Usage

### Authentication

The `AuthUtility` class provides methods for creating and verifying JWT tokens for different user types.

```javascript
import { AuthUtility } from 'b23-lib';

const auth = new AuthUtility({
  maxTokenAge: '30 days',
  userPrivateKeys: '["your-user-private-key"]',
  userPublicKeys: '["your-user-public-key"]',
  // other keys...
});

// Create a user token
const userToken = await auth.createUserToken('user-id', { additionalData: 'data' });

// Verify a user token
const payload = await auth.verifyUserToken(userToken);
```

### DynamoDB Utility

The `DynamoDBUtility` class provides methods for interacting with DynamoDB.

```javascript
import DynamoDBUtility from 'b23-lib';

const dynamoDB = new DynamoDBUtility({ region: 'us-east-1' });

// Put an item
await dynamoDB.putItem('TableName', { id: '1', name: 'Item' }, 'attribute_not_exists(id)');

// Get an item
const item = await dynamoDB.getItem('TableName', { id: '1' });
```

### Schema Validation

The `Schema` module provides methods for retrieving schema definitions.

```javascript
import Schema from 'b23-lib';

const schemaDefinition = Schema.getStandardSchemaDefinition();
```

### Utilities

The `Utils` module provides various utility functions.

```javascript
import Utils from 'b23-lib';

// Generate a UUID
const uuid = Utils.generateUUID();

// Check if a string is a valid UUID
const isValidUUID = Utils.isUUID('some-string');
```

### Logger

The `Logger` module provides methods for logging messages, errors, and warnings.

```javascript
import Logger from 'b23-lib';

Logger.logMessage('FunctionName', 'This is a log message');
Logger.logError('FunctionName', new Error('This is an error'));
```

### Fetch Utility

The `Fetch` module provides a utility for making HTTP requests.

```javascript
import Fetch from 'b23-lib';

const response = await Fetch('https://api.example.com', 'endpoint', 'GET');
```