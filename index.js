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

        // axios.post(
        //     `https://graph.facebook.com/v21.0/${phone_number_id}/messages`,
        //     {
        //         messaging_product: "whatsapp",
        //         to: "+" + sender_number_val,
        //         type: "text",
        //         text: {
        //             body: `Hello, ${sender_name}. Your message was: ${message_text}\nIt was received successfully.`
        //         }
        //     },
        //     {
        //         headers: {
        //             "Content-Type": "application/json",
        //             Authorization: `Bearer ${process.env.PERMANENT_ACCESS_TOKEN}`
        //         }
        //     }
        // );

        // const message_object = {
        //     messaging_product: "whatsapp",
        //     to: `+${sender_number_val}`,
        //     type: "text",
        //     text: {
        //         body: `Hello, ${sender_name}. Your message was: ${message_text}\nIt was received successfully.`
        //     }
        // };

        const message_object = {
            messaging_product: "whatsapp",
            to: `+${sender_number_val}`,
            type: "interactive",
            interactive: {
                type: "list",
                header: {
                  type: "text",
                  text: "Choose a reply"
                },
                body: {
                    text: `Hello, ${sender_name}. Your message was: ${message_text}\nIt was received successfully. 
                    Please choose an appropriate reply from the list:`
                },
                action: {
                    button: "Replies",
                    sections: [],
                }
            }
        };

        const positive_replies = [
            [
                "howdy_reply",
                "Hi, howdy?",
                "Use this reply if you want to greet the user."
            ],
            [
                "busy_reply",
                "Can I call you later?",
                "Use this reply if you are busy and want to call the user later."
            ],
            [
                "good_reply",
                "I am good. How are you?",
                "Use this reply if you are good and want to know how the user is."
            ]
        ];

        const negative_replies = [
            [
                "who_reply",
                "How did you get in?!",
                "Use this reply if the user is in your room standing behind you"
            ],
            [
                "scream_reply",
                "I'll scream!",
                "Use this reply if you're scared by the user's actions and want to scream"
            ],
            [
                "cops_reply",
                "I am calling the cops!",
                "Use this reply if you want to scare the user by calling the cops"
            ]
        ];

        const sections = [
            {
                title: "Positive Replies",
                rows: []
            },
            {
                title: "Negative Replies",
                rows: []
            }
        ];

        positive_replies.forEach((reply) => {
            let id = reply[0];
            let title = reply[1];
            let description = reply[2];

            sections[0].rows.push({
                id,
                title,
                description
            });
        });

        negative_replies.forEach((reply) => {
            let id = reply[0];
            let title = reply[1];
            let description = reply[2];

            sections[1].rows.push({
                id,
                title,
                description
            });
        });

        message_object.interactive.action.sections = sections;

        axios.post(
            `https://graph.facebook.com/v21.0/${phone_number_id}/messages`,
            message_object,
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
