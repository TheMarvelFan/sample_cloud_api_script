import { app } from "./app.js";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config({
    path: "./.env"
});

app.listen(process.env.PORT,()=>{
    console.log(`Server is running on port ${process.env.PORT}`);
});
