import express, {Router} from "express";
const app = Router()


app.get("/login",(req,res) => {
    res.json({
        message:"login routes"
    })
})

app.get("/signup",(req,res) => {
    res.json({
        message:"signup routes"
    })
})

export default app;
