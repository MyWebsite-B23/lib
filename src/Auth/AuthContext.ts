import assert from "assert";
import ErrorTypes from "../enums/ErrorTypes";
import { AuthType } from "./index";

export default class AuthContext {
  private static instance: AuthContext | null = null;
  private id: string;
  private type: AuthType;
  private token?: string;
  private initializedAt: Date;
  private lambdaName?: string;
  private requestId?: string;

  private constructor(id: string, type: AuthType, token: string, requestId: string) {
    this.id = id;
    this.type = type;
    this.token = token;
    this.lambdaName = process.env.AWS_LAMBDA_FUNCTION_NAME;
    this.initializedAt = new Date();
  }

  public static getInstance(): AuthContext {
    assert(AuthContext.instance, ErrorTypes.AUTH_CONTEXT_NOT_INITIALIZED);
    return AuthContext.instance;
  }

  public static init(id: string, type: AuthType, token: string, requestId: string): AuthContext {
    AuthContext.instance = new AuthContext(id, type, token, requestId);
    return AuthContext.instance;
  }

  public static uninit() {
    AuthContext.instance = null;
  }

  public getId(): string {
    return this.id;
  }

  public getType(): AuthType {
    return this.type;
  }

  public getToken(): string | undefined {
    return this.token;
  }
  
  public getLambdaName(): string | undefined{
    return this.lambdaName;
  }

  public getRequestId(): string | undefined {
    return this.requestId;
  }

  public getInitializedAt(): Date {
    return this.initializedAt;
  }

  public getSystemID(fallbackLambdaName: string): string {
    let baseId = this.lambdaName || fallbackLambdaName;
    if (this.requestId) {
      return `${baseId} - ${this.requestId}`;
    }
    return baseId;
  }
}