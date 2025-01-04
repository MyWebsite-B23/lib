import { importPKCS8, importSPKI, jwtVerify, SignJWT} from 'jose';
import util from 'util';
import ErrorTypes from '../enums/ErrorTypes';
import Logger from '../Logger';
import Utils from '../Utils';
import ResponseUtility from '../Utils/response';
import assert from 'assert';

type StringifiedJSONArray = string;

export type AuthUtilityConfig = {
  maxTokenAge?: string;
  userPrivateKeys?: StringifiedJSONArray;
  userPublicKeys?: StringifiedJSONArray;
  anonymousPrivateKeys?: StringifiedJSONArray;
  anonymousPublicKeys?: StringifiedJSONArray;
  systemPrivateKeys?: StringifiedJSONArray;
  systemPublicKeys?: StringifiedJSONArray;
  adminPrivateKeys?: StringifiedJSONArray;
  adminPublicKeys?: StringifiedJSONArray;
}

export const DefaultAuthUtilityConfig: AuthUtilityConfig = {
  maxTokenAge: '30 days',
  userPrivateKeys: '[]',
  userPublicKeys: '[]',
  anonymousPrivateKeys: '[]',
  anonymousPublicKeys: '[]',
  systemPrivateKeys: '[]',
  systemPublicKeys: '[]',
  adminPrivateKeys: '[]',
  adminPublicKeys: '[]',
}

export type AuthTokenType = 'Anon' | 'User' | 'System' | 'Admin';

export type AuthMiddlewareConfig = {
  allowAnonymous?: boolean;
  allowSystem?: boolean;
  allowUser?: boolean;
}

export const DefaultAuthMiddlewareConfig: AuthMiddlewareConfig = {
  allowAnonymous: false,
  allowSystem: true,
  allowUser: true
}

class AuthUtility {
  private maxTokenAge: string;
  private userPrivateKeys: string[];
  private userPublicKeys: string[];
  private anonymousPrivateKeys: string[];
  private anonymousPublicKeys: string[];
  private systemPrivateKeys: string[];
  private systemPublicKeys: string[];
  private adminPrivateKeys: string[];
  private adminPublicKeys: string[];

  constructor({ maxTokenAge = '30 days', userPrivateKeys = '[]', userPublicKeys = '[]', anonymousPrivateKeys = '[]', anonymousPublicKeys = '[]', systemPrivateKeys = '[]', systemPublicKeys = '[]', adminPrivateKeys = '[]', adminPublicKeys = '[]' }: AuthUtilityConfig = DefaultAuthUtilityConfig){
    this.maxTokenAge = maxTokenAge;

    this.userPrivateKeys = JSON.parse(userPrivateKeys);
    if(this.userPrivateKeys.length > 3){
      Logger.logWarning('AuthUtility', 'More than 1 user private key provided. The last key will be used for signing.');
    }
    this.userPublicKeys = JSON.parse(userPublicKeys);
    if(this.userPublicKeys.length > 3){
      Logger.logWarning('AuthUtility', 'More than 3 user public keys provided. This is not recommended.');
    }
    
    this.anonymousPrivateKeys = JSON.parse(anonymousPrivateKeys);
    if(this.anonymousPrivateKeys.length > 1){
      Logger.logWarning('AuthUtility', 'More than 1 anonymous private key provided. The last key will be used for signing.');
    }

    this.anonymousPublicKeys = JSON.parse(anonymousPublicKeys);
    if(this.anonymousPublicKeys.length > 3){
      Logger.logWarning('AuthUtility', 'More than 3 anonymous public keys provided. This is not recommended.');
    }

    this.systemPrivateKeys = JSON.parse(systemPrivateKeys);
    if(this.systemPrivateKeys.length > 1){
      Logger.logWarning('AuthUtility', 'More than 1 system private key provided. The last key will be used for signing.');
    }

    this.systemPublicKeys = JSON.parse(systemPublicKeys);
    if(this.systemPublicKeys.length > 3){
      Logger.logWarning('AuthUtility', 'More than 3 system public keys provided. This is not recommended.');
    }

    this.adminPrivateKeys = JSON.parse(adminPrivateKeys);
    if(this.adminPrivateKeys.length > 1){
      Logger.logWarning('AuthUtility', 'More than 1 admin private key provided. The last key will be used for signing.');
    }

    this.adminPublicKeys = JSON.parse(adminPublicKeys);
    if(this.adminPublicKeys.length > 3){
      Logger.logWarning('AuthUtility', 'More than 3 admin public keys provided. This is not recommended.');
    }
  }

  private async createSignedJWT(payload: any, privateKeyString: string, expiration: string){
    const privateKey = await importPKCS8(privateKeyString, 'RS256');
    const token = await new SignJWT(payload)
        .setProtectedHeader({ alg: 'RS256' })
        .setExpirationTime(expiration)
        .setIssuedAt()
        .sign(privateKey);

    return token;
  }

  private async verifySignedJWT(token: string, publicKeyString: string[], expiration: string){
    for(let i = publicKeyString.length - 1; i > 0 ; i--){
      try { 
        const publicKey = await importSPKI(publicKeyString[i], 'RS256')
        const jwt = await jwtVerify(token, publicKey, {  clockTolerance: 30, maxTokenAge: expiration });
        return jwt.payload;
      } catch (error) {
        // Try with the next oldest key
        continue;
      }
    }

    const publicKey = await importSPKI(publicKeyString[0], 'RS256')
    const jwt = await jwtVerify(token, publicKey, {  clockTolerance: 30, maxTokenAge: expiration });
    return jwt.payload;
  }

  async createAnonymousToken(id: string, additionalData?: object): Promise<string> {
    assert(this.anonymousPrivateKeys.length, ErrorTypes.ANONYMOUS_PRIVATE_KEY_NOT_FOUND);

    assert(Utils.isUUID(id), ErrorTypes.INVALID_UUID);
    const payload = {
        id,
        type: 'Anon',
        ...additionalData
    };

    return await this.createSignedJWT(payload, this.anonymousPrivateKeys[this.anonymousPrivateKeys.length - 1], this.maxTokenAge);
  }

  async verifyAnonymousToken(token: string){
    assert(this.anonymousPublicKeys.length, ErrorTypes.ANONYMOUS_PUBLIC_KEY_NOT_FOUND);
    const payload = await this.verifySignedJWT(token, this.anonymousPublicKeys, this.maxTokenAge);
    assert(payload.type === 'Anon', ErrorTypes.INVALID_AUTH_TYPE);
    return payload;
  }

  async createUserToken(id: string, additionalData?: object): Promise<string> {
    assert(this.userPrivateKeys.length, ErrorTypes.USER_PRIVATE_KEY_NOT_FOUND);
    assert(Utils.isUUID(id), ErrorTypes.INVALID_UUID);

    const payload = {
        id,
        type: 'User',
        ...additionalData
    };
    return await this.createSignedJWT(payload, this.userPrivateKeys[this.userPrivateKeys.length - 1], this.maxTokenAge);
  }

  async verifyUserToken(token: string){
    assert(this.userPublicKeys.length, ErrorTypes.USER_PUBLIC_KEY_NOT_FOUND);
    const payload =await this.verifySignedJWT(token, this.userPublicKeys, this.maxTokenAge);
    assert(payload.type === 'User', ErrorTypes.INVALID_AUTH_TYPE);
    return payload;
  }

  async createSystemToken(id: string, additionalData?: object): Promise<string> {
    assert(this.userPrivateKeys.length, ErrorTypes.USER_PRIVATE_KEY_NOT_FOUND);

    const payload = {
        id,
        type: 'System',
        ...additionalData
    };
    return await this.createSignedJWT(payload, this.systemPrivateKeys[this.systemPrivateKeys.length - 1], '5 min');
  }

  async verifySystemToken(token: string){
    assert(this.systemPublicKeys.length, ErrorTypes.USER_PUBLIC_KEY_NOT_FOUND);
    const payload = await this.verifySignedJWT(token, this.systemPublicKeys, '5 min');
    assert(payload.type === 'System', ErrorTypes.INVALID_AUTH_TYPE);
    return payload;
  }

  async createAdminToken(id: string, additionalData?: object): Promise<string> {
    assert(this.adminPrivateKeys.length, ErrorTypes.ADMIN_PRIVATE_KEY_NOT_FOUND);

    assert(Utils.isUUID(id), ErrorTypes.INVALID_UUID);
    const payload = {
        id,
        type: 'Admin',
        ...additionalData
    };
    return await this.createSignedJWT(payload, this.adminPrivateKeys[this.adminPrivateKeys.length - 1], this.maxTokenAge);
  }

  async verifyAdminToken(token: string){
    assert(this.adminPublicKeys.length, ErrorTypes.ADMIN_PUBLIC_KEY_NOT_FOUND);
    const payload = await this.verifySignedJWT(token, this.adminPublicKeys, this.maxTokenAge);
    assert(payload.type === 'Admin', ErrorTypes.INVALID_AUTH_TYPE);
    return payload;
  }

  AuthMiddleware ({ allowAnonymous = false, allowSystem = true, allowUser = true }: AuthMiddlewareConfig = DefaultAuthMiddlewareConfig){
    return async (req: any, res: any, next: any) => {
        try {
            const [authType, token] = req.get('Authorization')?.split(' ');
            if(!token) {
                throw new Error(ErrorTypes.INVALID_TOKEN);
            }
            let payload;
            switch (authType as AuthTokenType) {
              case 'Anon':
                  if(!allowAnonymous){
                    throw ResponseUtility.generateError(403, ErrorTypes.ANONYMOUS_SESSION_NOT_ALLOWED)
                  }
                  payload = await this.verifyAnonymousToken(token);
                  break;

              case 'User':
                  if(!allowUser){
                    throw ResponseUtility.generateError(403, ErrorTypes.USER_SESSION_NOT_ALLOWED)
                  }
                  payload = await this.verifyUserToken(token);
                  break;

              case 'System':
                  if(!allowSystem){
                    throw ResponseUtility.generateError(403, ErrorTypes.SYSTEM_SESSION_NOT_ALLOWED)
                  }
                  payload = await this.verifySystemToken(token);
                  Logger.logMessage('AuthMiddleware', 'System Name - ' + payload.id);
                  break;
              
              case 'Admin':
                  payload = await this.verifyAdminToken(token);
                  Logger.logMessage('AuthMiddleware', 'Admin Id - ' + payload.id);
                  break;

              default: 
                throw ResponseUtility.generateError(403, ErrorTypes.INVALID_AUTH_TYPE);
            }

            res.locals.auth = {
              authType,
              token,
              ...payload
            };
            next();
        } catch (error : any) {
            Logger.logError('AuthMiddleware', util.inspect(error))
            ResponseUtility.handleException('AuthMiddleware', ResponseUtility.generateError(401, error.error ? error.error : ErrorTypes.TOKEN_EXPIRED, true), res);
        }
    }
  }
}

export default AuthUtility; 
