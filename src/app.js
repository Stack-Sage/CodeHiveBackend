import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';

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
import { messageRouter } from './routes/message.routes.js'
import { dashboardRouter } from "./routes/dashboard.routes.js";
import { verifyJWT } from './middlewares/auth.middleware.js'
import { paymentRouter } from './routes/payment.routes.js';
import { sessionRouter } from './routes/session.routes.js';
import { notificationRouter } from './routes/notification.routes.js';

app.use("/api/users", userRouter)

app.use("/api/messages", messageRouter)

app.use("/api/dashboard", dashboardRouter)
app.use("/api/payments", paymentRouter)
app.use("/api/sessions", sessionRouter)
app.use("/api/notifications", notificationRouter);





app.use((err, req, res, next) => {
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
    errors: err.errors || [],
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});



export default app


