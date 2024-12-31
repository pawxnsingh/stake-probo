import express, {Response, Request} from "express"
import indexRouter from "./routes/index.route"
import cookieParser from "cookie-parser"
import dotenv from "dotenv"
import cors from "cors";

dotenv.config();
const app = express();

app.use(cors({
    credentials: true,
    origin: process.env["CLIENT_ORIGIN"]
}));

app.use(cookieParser());
app.use(express.urlencoded({extended: true}));
app.use(express.json());

// health check
app.get("/", (req: Request, res: Response) => {
    res.json({
        message: "Everything is up!!!!!"
    })
})

// index router
app.use("/api", indexRouter);

const port = process.env.PORT!;

app.listen(port, () => {
    console.log(`server is running at http://localhost:${port}`);
})