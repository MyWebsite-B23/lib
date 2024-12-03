import { EncryptJWT, jwtDecrypt} from 'jose';
import util from 'util';
import ErrorTypes from '../enums/ErrorTypes';
import Logger from '../Logger';
import ResponseUtility from '../Utils';

class AuthUtility {
  private secretToken: string;
  private maxTokenAge: string;

  constructor({ secret, maxTokenAge = '30 days' }: { secret: string, maxTokenAge: string }){
    this.secretToken = secret;
    this.maxTokenAge = maxTokenAge
  }

  async createToken(id: string, additionalData: object): Promise<string> {
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
    const jwt = await jwtDecrypt(token, secretKey, { maxTokenAge: this.maxTokenAge });
    return jwt.payload;
  }

  AuthMiddleware (){
    return async (req: any, res: any, next: any) => {
        try {
            const token = req.get('Authorization')?.split(' ')?.[1];
            if(!token) {
                throw new Error(ErrorTypes.INVALID_TOKEN);
            }
        
            const payload = await this.verifyToken(token);

            res.locals.auth = payload;
            next();
        } catch (error) {
            Logger.logError('AuthMiddleware', util.inspect(error))
            ResponseUtility.handleException('AuthMiddleware', ResponseUtility.generateError(401, ErrorTypes.TOKEN_EXPIRED), res);
        }
    }
  }
}

export default AuthUtility; 
