import { Request, RequestHandler } from 'express';
export interface JwtPayload {
    id: string;
    email: string;
    role: string;
}
export interface UserInfo {
    id: string;
    email: string;
    role: string;
    firstName: string;
    lastName: string;
    profilePicture: string | null;
    authProvider: string;
}
export interface AuthenticatedRequest extends Request {
    user?: UserInfo;
}
export declare const authenticate: RequestHandler;
export declare function authorize(...roles: string[]): RequestHandler;
//# sourceMappingURL=auth.d.ts.map