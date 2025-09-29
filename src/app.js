import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'

const app = express()

app.use(cors({
   origin:process.env.CORS_ORIGIN, 
   credentials :true,
}))

app.use(express.json({limit:"20kb"})) 
app.use(express.urlencoded({extended:true,limit:'20kb'}))
app.use(express.static("public"))

app.use(cookieParser())   


import { userRouter } from './routes/user.routes.js'
import { studentRouter } from './routes/student.routes.js'

app.use("/api/students",studentRouter)

app.use("/api/users",userRouter)


app.use((err, req, res, next) => {
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
    errors: err.errors || [],
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});




export default app

