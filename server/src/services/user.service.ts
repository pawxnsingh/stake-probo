import axios from "axios";
import qs from "qs"

interface getGoogleAuthTokensReturnType {
    id_token: string,
    access_token: string,
    scope: string,
    refresh_token: string,
    expires_in: number,
}

export const getGoogleAuthTokens = async ({code}: { code: string }): Promise<getGoogleAuthTokensReturnType> => {
    const url = "https://oauth2.googleapis.com/token";

    const values = {
        code,
        client_id: process.env["GOOGLE_CLIENT_ID"],
        client_secret: process.env["GOOGLE_CLIENT_SECRET"],
        redirect_uri: process.env["GOOGLE_OAUTH_REDIRECT_URL"],
        grant_type: "authorization_code",
    }

    try {
        const res = await axios.post<getGoogleAuthTokensReturnType>(url, qs.stringify(values), {
            // headers will tell the oauth, how to parse the req, and it contains the url
            // and the body is in key value pair and can contain &, = , / so replace them equivalent alternative for safe transmission
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            }
        });
        return res.data;
    } catch (error: any) {
        console.error(error, "Failed to fetch Google Oauth Tokens");
        throw new Error(error.message);
    }
}

interface getGoogleUserReturnType {
    sub: string,
    name: string,
    given_name: string,
    family_name: string,
    picture: string
    email: string,
    email_verified: boolean,
    locale: string
}

export const getGoogleUser = async ({id_token, access_token}: {
    id_token: string,
    access_token: string
}): Promise<getGoogleUserReturnType> => {
    const res = await axios.get<getGoogleUserReturnType>(`https://www.googleapis.com/oauth2/v3/userinfo?alt=json&access_token=${access_token}`, {
        headers: {
            Authorization: `Bearer ${id_token}`
        }
    })
    return res.data;
}