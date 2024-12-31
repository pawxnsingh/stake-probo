import {sign, verify, SignOptions} from "jsonwebtoken"

// object will have the users all detail and sessionId
export const signJwt = (object: Object, options?: SignOptions | undefined) => {
    return sign(object, process.env["AUTH_SECRET"]!, {
        ...(options && options)
    })
}

export function verifyJwt(token: string) {
    try {
        const decoded = verify(token, process.env["AUTH_SECRET"]!);
        return {
            valid: true,
            expired: false,
            decoded,
        };
    } catch (e: any) {
        console.error(e);
        return {
            valid: false,
            expired: e.message === "jwt expired",
            decoded: null,
        };
    }
}