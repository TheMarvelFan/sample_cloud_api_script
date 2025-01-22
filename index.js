import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/webhook", (req, res)=>{
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if(mode && token) {
        if(mode === "subscribe" && token === process.env.VERIFY_TOKEN) {
            console.log("Webhook verified");
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    }
});

app.post("/webhook",(req, res)=> {
    console.log("Message receive triggered");

    const sender_number = req.body.entry[0].changes[0].value.metadata.display_phone_number;
    const sender_name = req.body.entry[0].changes[0].value.contacts[0].profile.name;

    console.log(`Message sender number: ${sender_number}`);
    console.log(`Message sender name: ${sender_name}`);

    return res.status(200).send("Message received");
});

app.get("/",(req,res)=>{
    res.status(200).send("Webhook is running");
});

app.listen(process.env.PORT,()=>{
    console.log(`Server is running on port ${process.env.PORT}`);
});
