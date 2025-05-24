import { decodeJwt, importPKCS8, importSPKI, jwtVerify, SignJWT} from 'jose';
import ErrorTypes from '../enums/ErrorTypes';
import Logger from '../Logger';
import Utils from '../Utils';
import ResponseUtility from '../Utils/response';
import assert from 'assert';
import Fetch from '../Utils/fetch';
import AuthContext from './AuthContext';

type StringifiedJSONArray = string;

export type AuthPayloadData = {
  id: string;
  type: AuthType;
  verifier?: string;
  [key: string]: any;
}

export interface AuthUtilityConfig {
  userTokenAge: string;
  userPrivateKeys: StringifiedJSONArray;
  userPublicKeys: StringifiedJSONArray;
  anonymousTokenAge: string;
  anonymousPrivateKeys: StringifiedJSONArray;
  anonymousPublicKeys: StringifiedJSONArray;
  systemTokenAge: string;
  systemPrivateKeys: StringifiedJSONArray;
  systemPublicKeys: StringifiedJSONArray;
  adminTokenAge: string;
  adminPrivateKeys: StringifiedJSONArray;
  adminPublicKeys: StringifiedJSONArray;
  cdnKeys: StringifiedJSONArray;
}

export const DefaultAuthUtilityConfig: Readonly<AuthUtilityConfig> = {
  userTokenAge: '30 days',
  userPrivateKeys: '[]',
  userPublicKeys: '[]',
  anonymousTokenAge: '30 days',
  anonymousPrivateKeys: '[]',
  anonymousPublicKeys: '[]',
  systemTokenAge: '5 min',
  systemPrivateKeys: '[]',
  systemPublicKeys: '[]',
  adminTokenAge: '30 days',
  adminPrivateKeys: '[]',
  adminPublicKeys: '[]',
  cdnKeys: '[]',
};

export enum AuthType {
  ANON = 'Anon',
  USER = 'User',
  SYSTEM = 'System',
  ADMIN = 'Admin',
  CDN = 'CDN'
}

export interface AuthMiddlewareConfig {
  allowAnonymous: boolean;
  allowSystem: boolean;
  allowUser: boolean;
  allowCDN: boolean;
}

export const DefaultAuthMiddlewareConfig: Readonly<AuthMiddlewareConfig> = {
  allowAnonymous: false,
  allowSystem: true,
  allowUser: true,
  allowCDN: false
};

/**
 * A utility class for JWT authentication and authorization.
 */
class AuthUtility {
  private userTokenAge: string;
  private userPrivateKeys: string[];
  private userPublicKeys: string[];

  private anonymousTokenAge: string;
  private anonymousPrivateKeys: string[];
  private anonymousPublicKeys: string[];

  private systemTokenAge: string;
  private systemPrivateKeys: string[];
  private systemPublicKeys: string[];

  private adminTokenAge: string;
  private adminPrivateKeys: string[];
  private adminPublicKeys: string[];

  private cdnKeys: string[];

  /**
   * Initializes the AuthUtility class with a configuration.
   * @param config The configuration for the utility (optional).
   */
  constructor(config: Partial<AuthUtilityConfig> = DefaultAuthUtilityConfig) {
    const {
      userTokenAge,
      userPrivateKeys,
      userPublicKeys,
      anonymousTokenAge,
      anonymousPrivateKeys,
      anonymousPublicKeys,
      systemTokenAge,
      systemPrivateKeys,
      systemPublicKeys,
      adminTokenAge,
      adminPrivateKeys,
      adminPublicKeys,
      cdnKeys
    } = { ...DefaultAuthUtilityConfig, ...config };

    this.userTokenAge = userTokenAge;
    this.userPrivateKeys = this.parseKeyArray(userPrivateKeys, 'user private');
    this.userPublicKeys = this.parseKeyArray(userPublicKeys, 'user public');

    this.anonymousTokenAge = anonymousTokenAge;
    this.anonymousPrivateKeys = this.parseKeyArray(anonymousPrivateKeys, 'anonymous private');
    this.anonymousPublicKeys = this.parseKeyArray(anonymousPublicKeys, 'anonymous public');

    this.systemTokenAge = systemTokenAge;
    this.systemPrivateKeys = this.parseKeyArray(systemPrivateKeys, 'system private');
    this.systemPublicKeys = this.parseKeyArray(systemPublicKeys, 'system public');

    this.adminTokenAge = adminTokenAge;
    this.adminPrivateKeys = this.parseKeyArray(adminPrivateKeys, 'admin private');
    this.adminPublicKeys = this.parseKeyArray(adminPublicKeys, 'admin public');

    this.cdnKeys = this.parseKeyArray(cdnKeys, 'cdn');

    this.logWarnings();
  }

  private parseKeyArray(jsonString: string, keyType: string): string[] {
    try {
        const parsed = JSON.parse(jsonString);
        if (!Array.isArray(parsed) || !parsed.every(item => typeof item === 'string')) {
            Logger.logError('AuthUtility', `Invalid format for ${keyType} keys in config: Expected stringified array of strings.`);
            return [];
        }
        return parsed;
    } catch (error) {
        Logger.logError('AuthUtility', `Failed to parse ${keyType} keys from config: ${error}`);
        return [];
    }
  }

  /**
   * Logs warnings if the number of keys exceeds recommended limits.
   */
  private logWarnings() {
    const warn = (type: string, keys: string[], limit: number) =>
      keys.length > limit &&
      Logger.logWarning(
        'AuthUtility',
        `More than ${limit} ${type} keys provided. This is not recommended.`
      );

    warn('user private', this.userPrivateKeys, 3);
    warn('user public', this.userPublicKeys, 3);
    warn('anonymous private', this.anonymousPrivateKeys, 1);
    warn('anonymous public', this.anonymousPublicKeys, 3);
    warn('system private', this.systemPrivateKeys, 1);
    warn('system public', this.systemPublicKeys, 3);
    warn('admin private', this.adminPrivateKeys, 1);
    warn('admin public', this.adminPublicKeys, 3);
  }

  private async createSignedJWT(payload: AuthPayloadData, privateKeyString: string, expiration: string){
    const privateKey = await importPKCS8(privateKeyString, 'RS256');
    const token = await new SignJWT(payload)
        .setProtectedHeader({ alg: 'RS256' })
        .setExpirationTime(expiration)
        .setIssuedAt()
        .sign(privateKey);

    return token;
  }

  private async verifySignedJWT(token: string, publicKeyString: string[], expiration: string): Promise<AuthPayloadData> {
    for(let i = publicKeyString.length - 1; i >= 0 ; i--){
      try { 
        const publicKey = await importSPKI(publicKeyString[i], 'RS256')
        const jwt = await jwtVerify(token, publicKey, {  clockTolerance: 30, maxTokenAge: expiration });
        return jwt.payload as AuthPayloadData;
      } catch (error) {
        if (i === 0) {
          throw error;
        }
        // Try with the next oldest key
        continue;
      }
    }
    throw new Error(ErrorTypes.INVALID_TOKEN);
  }

  
  /**
   * Creates an anonymous token with the given ID and additional data.
   *
   * @param id - The unique identifier for the token. Must be a valid UUID.
   * @param additionalData - Optional additional data to include in the token payload.
   * @returns A promise that resolves to the signed JWT as a string.
   * @throws Will throw an error if no anonymous private keys are found or if the ID is not a valid UUID.
   */
  async createAnonymousToken(id: string, additionalData?: object): Promise<string> {
    assert(this.anonymousPrivateKeys.length, ErrorTypes.ANONYMOUS_PRIVATE_KEY_NOT_FOUND);

    assert(Utils.isUUID(id), ErrorTypes.INVALID_UUID);
    const payload = {
        id,
        type: AuthType.ANON,
        ...additionalData
    };

    return await this.createSignedJWT(payload, this.anonymousPrivateKeys[this.anonymousPrivateKeys.length - 1], this.anonymousTokenAge);
  }

  /**
   * Verifies an anonymous token by checking its signature and payload type.
   *
   * @param token - The JWT token to be verified.
   * @returns The payload of the verified token.
   * @throws Will throw an error if no anonymous public keys are found or if the token type is invalid.
   */
  async verifyAnonymousToken(token: string){
    assert(this.anonymousPublicKeys.length, ErrorTypes.ANONYMOUS_PUBLIC_KEY_NOT_FOUND);
    const payload = await this.verifySignedJWT(token, this.anonymousPublicKeys, this.anonymousTokenAge);
    assert(payload.type === AuthType.ANON, ErrorTypes.INVALID_AUTH_TYPE);
    return payload;
  }

  /**
   * Creates a signed JWT token for a user.
   *
   * @param id - The UUID of the user.
   * @param additionalData - Optional additional data to include in the token payload.
   * @returns A promise that resolves to the signed JWT token as a string.
   * @throws Will throw an error if no user private keys are found or if the provided id is not a valid UUID.
   */
  async createUserToken(id: string, additionalData?: object): Promise<string> {
    assert(this.userPrivateKeys.length, ErrorTypes.USER_PRIVATE_KEY_NOT_FOUND);
    assert(Utils.isUUID(id), ErrorTypes.INVALID_UUID);

    const payload = {
        id,
        type: AuthType.USER,
        ...additionalData
    };
    return await this.createSignedJWT(payload, this.userPrivateKeys[this.userPrivateKeys.length - 1], this.userTokenAge);
  }

  /**
   * Verifies the provided user token by checking its signature and payload.
   *
   * @param token - The JWT token to be verified.
   * @returns The payload of the verified token if valid.
   * @throws Will throw an error if no user public keys are found or if the token type is invalid.
   */
  async verifyUserToken(token: string){
    assert(this.userPublicKeys.length, ErrorTypes.USER_PUBLIC_KEY_NOT_FOUND);
    const payload = await this.verifySignedJWT(token, this.userPublicKeys, this.userTokenAge);
    assert(payload.type === AuthType.USER, ErrorTypes.INVALID_AUTH_TYPE);
    return payload;
  }

  /**
   * Creates a signed JWT (JSON Web Token) for a system with the given ID and optional additional data.
   *
   * @param id - The unique identifier for the system.
   * @param additionalData - Optional additional data to include in the token payload.
   * @returns A promise that resolves to the signed JWT as a string.
   * @throws Will throw an error if no system private keys are found.
   */
  async createSystemToken(id: string, additionalData?: object): Promise<string> {
    assert(this.systemPrivateKeys.length, ErrorTypes.SYSTEM_PRIVATE_KEY_NOT_FOUND);

    const payload = {
        id,
        type: AuthType.SYSTEM,
        ...additionalData
    };
    return await this.createSignedJWT(payload, this.systemPrivateKeys[this.systemPrivateKeys.length - 1], this.systemTokenAge);
  }

  /**
   * Verifies a system token by checking its signature and payload type.
   *
   * @param token - The JWT token to be verified.
   * @returns The payload of the verified token.
   * @throws Will throw an error if no system public keys are found or if the token type is not 'System'.
   */
  async verifySystemToken(token: string){
    assert(this.systemPublicKeys.length, ErrorTypes.USER_PUBLIC_KEY_NOT_FOUND);
    const payload = await this.verifySignedJWT(token, this.systemPublicKeys, this.systemTokenAge);
    assert(payload.type === AuthType.SYSTEM, ErrorTypes.INVALID_AUTH_TYPE);
    return payload;
  }

  /**
   * Creates a signed JWT token for an admin user.
   *
   * @param email - The email of the admin user.
   * @param additionalData - Optional additional data to include in the token payload.
   * @returns A promise that resolves to the signed JWT token string.
   * @throws Will throw an error if no admin private keys are found or if the provided id is not a valid UUID.
   */
  async createAdminToken(email: string, verifier: string, additionalData?: object): Promise<string> {
    assert(this.adminPrivateKeys.length, ErrorTypes.ADMIN_PRIVATE_KEY_NOT_FOUND);

    assert(Utils.isEmail(email), ErrorTypes.INVALID_EMAIL);
    assert(Utils.isURL(verifier), ErrorTypes.INVALID_VERIFIER);
    const payload = {
        id: email,
        type: AuthType.ADMIN,
        verifier: verifier,
        ...additionalData
    };
    return await this.createSignedJWT(payload, this.adminPrivateKeys[this.adminPrivateKeys.length - 1], this.adminTokenAge);
  }

  /**
   * Verifies the provided admin token by checking its signature and payload.
   * Ensures that the token is signed with one of the known admin public keys
   * and that the payload type is 'Admin'.
   *
   * @param token - The JWT token to be verified.
   * @param permissions - The permissions required for the admin user.
   * @param authenticate - Whether to authenticate the token with the verifier.
   * @returns The payload of the verified token.
   * @throws Will throw an error if no admin public keys are found or if the token is invalid or if the admin doesn't have proper permissions.
   */
  async verifyAdminToken(token: string, permissions: string[], authenticate: boolean){
    assert(this.adminPublicKeys.length, ErrorTypes.ADMIN_PUBLIC_KEY_NOT_FOUND);
    const payload = await this.verifySignedJWT(token, this.adminPublicKeys, this.adminTokenAge);
    assert(payload.type === AuthType.ADMIN, ErrorTypes.INVALID_AUTH_TYPE);

    if(authenticate) {
      const response = await Fetch(payload.verifier as string, '', 'POST', {}, { token, permissions });
      assert(response.data.isTokenValid === true, ErrorTypes.INVALID_TOKEN);
  
      if(response.data.hasPermissions !== true){
        throw ResponseUtility.generateError(403, ErrorTypes.INVALID_PERMISSIONS)
      }
    }

    return payload;
  }

  async verifyCDNToken(token: string) {
    assert(this.cdnKeys.includes(token), ErrorTypes.INVALID_TOKEN);

    const payload: AuthPayloadData = {
      id: token,
      type: AuthType.CDN,
    };

    return payload;
  }

  /**
   * Middleware function to handle authentication based on different token types.
   * It verifies the token and sets the authentication details in the response locals.
   *
   * @param {Partial<AuthMiddlewareConfig>} [config=DefaultAuthMiddlewareConfig] - Configuration object to customize the middleware behavior.
   * @returns Middleware function to handle authentication.
   */
  AuthMiddleware(config: Partial<AuthMiddlewareConfig> = DefaultAuthMiddlewareConfig, permissions: string[] = []) {
    const { allowAnonymous, allowSystem, allowUser, allowCDN } = { ...DefaultAuthMiddlewareConfig, ...config };
    return async (req: any, res: any, next: any) => {
      try {
        const [authType, token] = req.get('Authorization')?.split(' ') || [];
        if (!token) throw new Error(ErrorTypes.INVALID_TOKEN);

        let payload;
        switch (authType as AuthType) {
          case AuthType.ANON:
            if (!allowAnonymous) throw ResponseUtility.generateError(403, ErrorTypes.ANONYMOUS_SESSION_NOT_ALLOWED);
            payload = await this.verifyAnonymousToken(token);
            break;
          case AuthType.USER:
            if (!allowUser) throw ResponseUtility.generateError(403, ErrorTypes.USER_SESSION_NOT_ALLOWED);
            payload = await this.verifyUserToken(token);
            break;
          case AuthType.SYSTEM:
            if (!allowSystem) throw ResponseUtility.generateError(403, ErrorTypes.SYSTEM_SESSION_NOT_ALLOWED);
            payload = await this.verifySystemToken(token);
            break;
          case AuthType.ADMIN:
            payload = await this.verifyAdminToken(token, permissions, true);
            break;
          case AuthType.CDN:
            if (!allowCDN) throw ResponseUtility.generateError(403, ErrorTypes.CDN_SESSION_NOT_ALLOWED);
            payload = await this.verifyCDNToken(token);

            break;
          default:
            throw ResponseUtility.generateError(403, ErrorTypes.INVALID_AUTH_TYPE);
        }

        next();
      } catch (error: any) {
        Logger.logError('AuthMiddleware', error);
        ResponseUtility.handleException(
          'AuthMiddleware',
          ResponseUtility.generateError(401, error.error || ErrorTypes.TOKEN_EXPIRED, true),
          res
        );
      }
    };
  }

  /**
   * Decodes the payload of a JWT using jose.decodeJwt without verifying
   * the signature or expiration.
   * WARNING: This is insecure as it doesn't validate the token's integrity.
   * Use only when you understand the risks and have a specific need.
   *
   * @param token - The JWT string.
   * @returns The decoded payload object, or null if the token format is invalid or decoding fails.
   */
  decodeJWTPayloadWithJose(token: string): Record<string, any> | null {
    if (!token || typeof token !== 'string') {
      Logger.logError("AuthContextMiddleware", "Invalid token provided for decoding.");
      return null;
    }

    try {
      const payload = decodeJwt(token);
      return payload;
    } catch (error) {
      Logger.logError("AuthContextMiddleware", `Failed to decode JWT payload: ${error}`);
      return null;
    }
  }

  AuthContextMiddleware() {
    return async (req: any, res: any, next: any) => {
      try {
        const [authType, token] = req.get('Authorization')?.split(' ') || [];
        let payload = authType === AuthType.CDN ? { id: token, type: AuthType.CDN } : this.decodeJWTPayloadWithJose(token);

        const authContext = AuthContext.init(payload?.id || token, payload?.type || authType, token, req.get('x-request-id'));
        Logger.logMessage('AuthContextMiddleware', `AuthContext initialized: ${authContext.getType() || 'No-Type'} - ${authContext.getId() || 'No-Id'}`);

        res.on('finish', () => {
          Logger.logMessage('AuthContextMiddleware', 'Uninitializing AuthContext');
          AuthContext.uninit();
        });

        next();
      } catch (error: any) {
        Logger.logError('AuthContextMiddleware', error);
        ResponseUtility.handleException(
          'AuthContextMiddleware',
          ResponseUtility.generateError(500, error.error || ErrorTypes.INTERNAL_SERVER_ERROR, true),
          res
        );
      }
    };
  }
}

export default AuthUtility;
export { AuthContext };

