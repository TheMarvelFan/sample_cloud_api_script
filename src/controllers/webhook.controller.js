import { asyncHandler } from "../utils/asyncHandler.js";
import { sendMessage } from "../service/message.service.js";

const validateWebhook = (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode && token) {
        if (mode === "subscribe" && token === process.env.VERIFY_TOKEN) {
            console.log("Webhook verified!");
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    }
};

const sendOrReceiveMessage = asyncHandler(async (req, res) => {
    console.log("Message receive triggered");

    if (!req.body) {
        console.log(JSON.stringify(req));
    }

    if (messageIsReceived(req)) {
        const body = req.body;

        const phone_number_id = body.entry[0].changes[0].value.metadata?.phone_number_id;
        let senderPhoneNumber = body.entry[0].changes[0].value.messages[0].from;

        if (messageIsInteractive(req)) {
            const option_chosen = body.entry[0].changes[0].value.messages[0].interactive;

            if (messageIsListReply(option_chosen)) {
                const reply_id = option_chosen.list_reply.id;

                const message_to_send = setTextMessageObject();

                message_to_send.text.body = chooseReplyBasedOnMessage(reply_id);

                // await axios.post(
                //     `https://graph.facebook.com/v21.0/${phone_number_id}/messages`,
                //     message_to_send,
                //     {
                //         headers: {
                //             "Content-Type": "application/json",
                //             Authorization: `Bearer ${ process.env.PERMANENT_ACCESS_TOKEN }`
                //         }
                //     }
                // );

                const response = await sendMessage(message_to_send, phone_number_id);
                console.log(response);
            }
        } else if (messageIsLocationMessage(req)) {
            let latitude = body.entry[0].changes[0].value.messages[0].location.latitude;
            let longitude = body.entry[0].changes[0].value.messages[0].location.longitude;

            const timestamp = body.entry[0].changes[0].value.messages[0].timestamp;
            const unixTimestamp = parseInt(timestamp, 10);
            const readableDate = new Date(unixTimestamp * 1000);

            const dateTimeFormatOptions = {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                timeZone: 'Asia/Kolkata'
            };

            const humanReadableDate = new Intl.DateTimeFormat('en-IN', dateTimeFormatOptions).format(readableDate);

            let address = body.entry[0].changes[0].value.messages[0].location.address;
            address = address || "Address not provided!";

            const northOrSouth = latitude.toString().charAt(0) === "-" ? "South" : "North";
            const eastOrWest = longitude.toString().charAt(0) === "-" ? "West" : "East";

            latitude = latitude.toString().replace("-", "");
            longitude = longitude.toString().replace("-", "");

            const message_to_send = setMessageResponseObject("text");

            message_to_send.text.body = `Got it! Your location is: ${ longitude + "° " + eastOrWest + ", " + latitude + "° " + northOrSouth }\nLast updated at: ${ humanReadableDate }\nYour address is: ${ address }`;

            // await axios.post(
            //     `https://graph.facebook.com/v21.0/${phone_number_id}/messages`,
            //     message_to_send,
            //     {
            //         headers: {
            //             "Content-Type": "application/json",
            //             Authorization: `Bearer ${ process.env.PERMANENT_ACCESS_TOKEN }`
            //         }
            //     }
            // );

            const response = await sendMessage(message_to_send, phone_number_id);
            console.log(response)
        } else {
            // making sure sender number is a string
            senderPhoneNumber = `${ senderPhoneNumber }`;

            // extracting last 10 digits of sender number and appending "+" at the beginning, and "-" after country code
            // works for all countries with 10-digit phone numbers

            const sender_number = "+" + senderPhoneNumber.substring(0, senderPhoneNumber.length - 10) +
                "-" + senderPhoneNumber.slice(-10);

            const sender_name = body.entry[0].changes[0].value.contacts[0].profile.name;

            const message_text = body.entry[0].changes[0].value.messages[0].text.body;

            console.log(`Sender Name: ${ sender_name }`);
            console.log(`Sender Number: ${ sender_number }`);
            console.log(`Message: ${ message_text }`);

            // axios.post(
            //     `https://graph.facebook.com/v21.0/${phone_number_id}/messages`,
            //     {
            //         messaging_product: "whatsapp",
            //         to: "+" + sender_number_val,
            //         type: "text",
            //         text: {
            //             body: `Hello, ${ sender_name }. Your message was: ${ message_text }\nIt was received successfully.`
            //         }
            //     },
            //     {
            //         headers: {
            //             "Content-Type": "application/json",
            //             Authorization: `Bearer ${ process.env.PERMANENT_ACCESS_TOKEN }`
            //         }
            //     }
            // );

            // const message_to_send = setTextMessageObject(senderPhoneNumber);
            // message_object.text.body = `Hello, ${ sender_name }. Your message was: ${message_text}\nIt was received successfully.`;
            //
            // const message_to_send = setListMessageObject(senderPhoneNumber);
            // message_object.interactive.body.text = `Hello, ${ sender_name }. Your message was: ${ message_text }\nIt was received successfully.\nPlease choose an appropriate reply from the list:`;
            //
            // const message_to_send = setAddressMessageObject(sender_number_val, sender_name);
            // message_object.interactive.body.text = `Hello, ${ sender_name }. Your message was: ${ message_text }\nIt was received successfully.\nPlease provide your address for delivery:`;

            const message_to_send = setLocationMessageObject(senderPhoneNumber);
            message_to_send.interactive.body.text = `Hello, ${ sender_name }. Your message was: ${ message_text }\nIt was received successfully.\nPlease provide your desired location for delivery:`

            message_to_send.interactive.action.sections = setMessageListSections();

            // await axios.post(
            //     `https://graph.facebook.com/v21.0/${ phone_number_id }/messages`,
            //     message_to_send,
            //     {
            //         headers: {
            //             "Content-Type": "application/json",
            //             Authorization: `Bearer ${ process.env.PERMANENT_ACCESS_TOKEN }`
            //         }
            //     }
            // );

            const response = await sendMessage(message_to_send, phone_number_id);
            console.log(response);
        }
    }

    return res.status(200).send("Message received");
});

// verifying if message was received

const messageIsReceived = (req) => {
    return req.body.entry &&
    req.body.entry[0].changes &&
    req.body.entry[0].changes[0].value.messages &&
    req.body.entry[0].changes[0].value.messages[0];
};

// message types

const messageIsInteractive = (req) => {
    return req.body.entry[0].changes[0].value.messages[0].type &&
    req.body.entry[0].changes[0].value.messages[0].type === "interactive"
};

const messageIsListReply = (option_chosen) => {
    return option_chosen.type === "list_reply"
};

const messageIsLocationMessage = (req) => {
    return req.body.entry[0].changes[0].value.messages[0].type &&
    req.body.entry[0].changes[0].value.messages[0].type === "location"
};

// choose reply based on list option chosen

const chooseReplyBasedOnMessage = (reply_id) => {
    if (reply_id === "howdy_reply") {
        return "Howdy, partner";
    }

    if (reply_id === "busy_reply") {
        return "That's fine. I'll call you later";
    }

    if (reply_id === "good_reply") {
        return "I am good too. Thanks for asking";
    }

    if (reply_id === "how_reply") {
        return "Through the window!";
    }

    if (reply_id === "scream_reply") {
        return "Scream all you want, no one can help you now!";
    }

    if (reply_id === "cops_reply") {
        return "By the time they arrive, you'll be gone!";
    }
};

const setTextMessageObject = (senderPhoneNumber) => {
    return {
        messaging_product: "whatsapp",
        to: `+${ senderPhoneNumber }`,
        type: "text",
        text: {
            body: ""
        }
    };
};

const setListMessageObject = (senderPhoneNumber) => {
    return {
        messaging_product: "whatsapp",
        to: `+${ senderPhoneNumber }`,
        type: "interactive",
        interactive: {
            type: "list",
            header: {
                type: "text",
                text: "Choose a reply"
            },
            body: {
                text: ""
            },
            action: {
                button: "Replies",
                sections: [],
            }
        }
    };
};

const setAddressMessageObject = (sender_number_val, sender_name) => {
    return {
        messaging_product: "whatsapp",
        to: `+${ sender_number_val }`,
        type: "interactive",
        interactive: {
            type: "address_message",
            body: {
                text: ""
            },
            action: {
                name: "address_message",
                parameters: {
                    country: "IN",
                    values: {
                        name: `${ sender_name }`,
                        phone_number: `${ sender_number_val.slice(-10) }`
                    }
                }
            }
        }
    };
};

const setLocationMessageObject = (senderPhoneNumber) => {
    return {
        messaging_product: "whatsapp",
        to: `+${ senderPhoneNumber }`,
        type: "interactive",
        interactive: {
            type: "location_request_message",
            body: {
                text: ""
            },
            action: {
                name: "send_location"
            }
        }
    };
};

const setMessageListSections = () => {
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
            "how_reply",
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

    return sections;
};

export {
    validateWebhook,
    sendOrReceiveMessage
};
