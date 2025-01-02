import { EncryptJWT, importPKCS8, importSPKI, jwtDecrypt, jwtVerify, SignJWT} from 'jose';
import util from 'util';
import ErrorTypes from '../enums/ErrorTypes';
import Logger from '../Logger';
import Utils, { ResponseUtility } from '../Utils';
import assert from 'assert';

class AuthUtility {
  private secretToken: string;
  private maxTokenAge: string;
  private anonymousPrivateKey: string;
  private anonymousPublicKey: string;

  constructor({ secret = '', maxTokenAge = '30 days', anonymousPrivateKey = '', anonymousPublicKey = '' }: { secret?: string, maxTokenAge?: string, anonymousPrivateKey?: string, anonymousPublicKey?: string}){
    this.secretToken = secret;
    this.maxTokenAge = maxTokenAge;
    this.anonymousPrivateKey = anonymousPrivateKey;
    this.anonymousPublicKey = anonymousPublicKey;
  }

  async createAnonymousToken(id: string, additionalData?: object): Promise<string> {
    assert(Utils.isUUID(id), ErrorTypes.INVALID_UUID);
    const payload = {
        id,
        ...additionalData
    };

    const privateKey = await importPKCS8(this.anonymousPrivateKey, 'RS256');
    const token = await new SignJWT(payload)
        .setProtectedHeader({ alg: 'RS256' })
        .setExpirationTime(this.maxTokenAge)
        .setIssuedAt()
        .sign(privateKey);

    return token;
  }

  async verifyAnonymousToken(token: string){
    const publicKey = await importSPKI(this.anonymousPublicKey, 'RS256')
    const jwt = await jwtVerify(token, publicKey, {  clockTolerance: 30, maxTokenAge: this.maxTokenAge });
    return jwt.payload;
  }

  async createToken(id: string, additionalData?: object): Promise<string> {
    assert(Utils.isUUID(id), ErrorTypes.INVALID_UUID);
    const payload = {
        id,
        ...additionalData
    };

    const secretKey = Buffer.from(this.secretToken, 'hex');
    const token = await new EncryptJWT(payload)
        .setExpirationTime(this.maxTokenAge)
        .setIssuedAt()
        .setProtectedHeader({ alg: 'dir', enc: 'A256CBC-HS512' })
        .encrypt(secretKey);

    return token;
  }

  async verifyToken(token: string){
    const secretKey = Buffer.from(this.secretToken, 'hex');
    const jwt = await jwtDecrypt(token, secretKey, { clockTolerance: 30, maxTokenAge: this.maxTokenAge });
    return jwt.payload;
  }

  AuthMiddleware (allowAnonymous: boolean){
    return async (req: any, res: any, next: any) => {
        try {
            const [authType, token] = req.get('Authorization')?.split(' ');
            if(!token) {
                throw new Error(ErrorTypes.INVALID_TOKEN);
            }
            let payload;
            switch (authType) {
              case 'Anon':
                  if(!allowAnonymous){
                    throw ResponseUtility.generateError(403, ErrorTypes.ANONYMOUS_SESSION_NOT_ALLOWED, true, true)
                  }
                  payload = await this.verifyAnonymousToken(token);
                  break;

              case 'User':
                  payload = await this.verifyToken(token);
                  break; 

              case 'System':
                  break;

              default: 
                throw ResponseUtility.generateError(403, ErrorTypes.INVALID_AUTH_TYPE, true, true);
            }

            res.locals.auth = {
              authType,
              token,
              ...payload
            };
            next();
        } catch (error) {
            Logger.logError('AuthMiddleware', util.inspect(error))
            ResponseUtility.handleException('AuthMiddleware', ResponseUtility.generateError(401, ErrorTypes.TOKEN_EXPIRED), res);
        }
    }
  }
}

export default AuthUtility; 
