import express from "express";
import dotenv from "dotenv";
import axios from "axios";

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

    if (
        req.body.entry &&
        req.body.entry[0].changes &&
        req.body.entry[0].changes[0].value.messages &&
        req.body.entry[0].changes[0].value.messages[0]
    ) {
        const sender_number_val = `${req.body.entry[0].changes[0].value.messages[0].from}`;
        const sender_number = "+" + sender_number_val.substring(0, sender_number_val.length - 10) +
            "-" + sender_number_val.slice(-10);

        const sender_name = req.body.entry[0].changes[0].value.contacts[0].profile.name;

        const message_text = req.body.entry[0].changes[0].value.messages[0].text.body;

        console.log(`Sender Name: ${sender_name}`);
        console.log(`Sender Number: ${sender_number}`);
        console.log(`Message: ${message_text}`);

        const phone_number_id = req.body.entry[0].changes[0].value.metadata?.phone_number_id;

        axios.post(
            `https://graph.facebook.com/v21.0/${phone_number_id}/messages`,
            {
                messaging_product: "whatsapp",
                to: "+" + sender_number_val,
                type: "text",
                text: {
                    body: `Hello, ${sender_name}. Your message was: ${message_text}\nIt was received successfully.`
                }
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${process.env.PERMANENT_ACCESS_TOKEN}`
                }
            }
        );
    }

    return res.status(200).send("Message received");
});

app.get("/",(req,res)=>{
    res.status(200).send("Webhook is running");
});

app.listen(process.env.PORT,()=>{
    console.log(`Server is running on port ${process.env.PORT}`);
});
