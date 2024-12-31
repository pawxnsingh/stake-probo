import {googleOauth} from "../controllers/googleOauth.controller";
import {Router} from "express";

const app = Router()

app.get("/google", googleOauth);

export default app;
