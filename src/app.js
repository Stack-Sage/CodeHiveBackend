import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';

const app = express()

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});

const upload = multer({ storage: multer.memoryStorage() });

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
import { messageRouter } from './routes/message.routes.js'

// POST /api/messages/upload -> { secure_url }
app.post('/api/messages/upload', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'file is required' });
    }
    const b64 = Buffer.from(req.file.buffer).toString('base64');
    const dataUri = `data:${req.file.mimetype};base64,${b64}`;
    const result = await cloudinary.uploader.upload(dataUri, { resource_type: "auto" });
    return res.json({ success: true, secure_url: result.secure_url });
  } catch (err) {
    next(err);
  }
});

app.use("/api/students",studentRouter)

app.use("/api/users",userRouter)

app.use("/api/messages", messageRouter)


app.use((err, req, res, next) => {
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
    errors: err.errors || [],
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});



export default app

