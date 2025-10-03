import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

import app from "./app.js";
import ConnectDB from "./db/db_index.js";
import http from "http";


ConnectDB()
  .then(() => {
    const server = http.createServer(app);


    const PORT = process.env.PORT || 6000;
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((error) => {
    console.log("MongoDB connection failed: ", error);
  });
