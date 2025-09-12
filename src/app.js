import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'

const app = express()

app.use(cors({
   origin:process.env.CORS_ORIGIN, 
   credentials :true,
}))

app.use(express.json({limit:"20kb"})) 
app.use(express.urlencoded({limit:'20kb'}))
app.use(express.static("public"))

app.use(cookieParser())   

app.use("/",(req,res)=>{
   res.send("I'm just a Chill guy!!")
})

import { userRouter } from './routes/user.routes.js'

app.use("/api/user",userRouter)





export default app

