import {Request, Response, CookieOptions} from "express";
import {getGoogleAuthTokens, getGoogleUser} from "../services/user.service";
import {prisma} from "../utils/db"
import {signJwt} from "../utils/jwt";

// GET - api/sessions/oauth/google
export const googleOauth = async (req: Request, res: Response): Promise<any> => {
    try {
        // get the code from the query string
        const code = req.query.code as string;
        // get the id and access token with the code
        const {id_token, access_token, scope, refresh_token, expires_in} = await getGoogleAuthTokens({code});
        // use the access code to get the intended information of user
        console.log({id_token, access_token, scope, refresh_token, expires_in})
        const googleUser = await getGoogleUser({id_token, access_token})
        console.log({googleUser})

        if (!googleUser.email_verified) {
            return res.status(403).send('Google account is not verified');
        }

        // upsert user in the postgres database
        const username = googleUser.email.split("@")[0];
        const user = await prisma.user.upsert({
            where: {
                email: googleUser.email
            },
            update: {},
            create: {
                name: googleUser.name,
                email: googleUser.email,
                image: googleUser.picture,
                username: username
            }
        })
        console.log({user})
        // session, create session
        const session = await prisma.account.upsert({
            where: {
                provider_providerAccountId: {
                    provider: "google",
                    providerAccountId: googleUser.sub
                }
            },
            update: {
                refresh_token,
                access_token,
                scope,
                id_token,
                expires_at: expires_in
            },
            create: {
                type: "oauth",
                provider: "google",
                providerAccountId: googleUser.sub,
                refresh_token,
                access_token,
                expires_at: expires_in,
                token_type: "bearer",
                scope,
                id_token,
                userId: user.id
            }
        })
        console.log({session})

        // create session and tokens(access and refresh token)
        const accessToken = signJwt({...user, session: session.id}, {
            expiresIn: process.env["ACCESS_TOKEN_TTL"]
        });

        const refreshToken = signJwt(
            {...user, session: session.id}, {
                expiresIn: process.env["REFRESH_TOKEN_TTL"]
            }
        );

        // then send a response to with set-cookies and redirect to intended url(client)
        res.cookie("accessToken", accessToken, accessTokenCookieOptions);
        res.cookie("refreshToken", refreshToken, refreshTokenCookieOptions);
        return res.redirect(`${process.env.CLIENT_ORIGIN}`);

    } catch (e: any) {
        console.error(e, "failed to authorize with google")
        return res.redirect(`${process.env.CLIENT_ORIGIN}/oauth/error`);
    }
}

export const accessTokenCookieOptions: CookieOptions = {
    maxAge: 900000, // 15 min
    httpOnly: true,
    domain: "localhost",
    path: "/",
    sameSite: "lax",
    secure: false,
};

export const refreshTokenCookieOptions: CookieOptions = {
    ...accessTokenCookieOptions,
    maxAge: 3.154e10, // 1 year
};