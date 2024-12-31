import {Router} from "express";
import casinoRouter from "./casino.router"
import oauthRouter from "./oauth.route"
import authRouter from "./auth.route"

const app = Router();

// auth router
app.use("/auth", authRouter);
// oauth routers
app.use("/sessions/oauth", oauthRouter);
// casino router
app.use("/casio/games", casinoRouter);

export default app;
