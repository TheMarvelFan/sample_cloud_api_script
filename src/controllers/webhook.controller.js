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

        const phone_number_id = getPhoneNumberIdFromBody(body);
        let senderPhoneNumber = getSenderPhoneNumberFromBody(body);

        if (messageIsInteractive(req)) {
            const interactiveMessageType = getInteractiveMessageType(body);

            if (messageIsListReply(interactiveMessageType)) {
                const reply_id = getOptionChosen(interactiveMessageType);

                const message_to_send = setTextMessageObject();

                message_to_send.text.body = chooseReplyBasedOnMessage(reply_id);

                const response = await sendMessage(message_to_send, phone_number_id);
                console.log(response);
            }
        } else if (messageIsLocationMessage(req)) {
            const message_to_send = createLocationMessageReply(body, senderPhoneNumber);

            const response = await sendMessage(message_to_send, phone_number_id);
            console.log(response)
        } else {
            // making sure sender number is a string
            senderPhoneNumber = String(senderPhoneNumber);

            const sender_number = getFormattedNumber(senderPhoneNumber);

            const sender_name = getSenderNameFromBody(body);

            const message_text = getReceivedMessageText(body);

            printMessageDetails(sender_name, sender_number, message_text);

            let message_to_send;

            // message_to_send = createTextMessage(senderPhoneNumber, sender_name, message_text);

            // message_to_send = createListMessage(senderPhoneNumber, sender_name, message_text);

            // message_to_send = createAddressMessage(senderPhoneNumber, sender_name, message_text);

            message_to_send = createLocationMessage(senderPhoneNumber, sender_name, message_text);

            const response = await sendMessage(message_to_send, phone_number_id);
            console.log(response);
        }
    }

    return res.status(200).send("Message received");
});

// creating different types of messages

const createTextMessage = (senderPhoneNumber, sender_name, message_text) => {
    const message_to_send = setTextMessageObject(senderPhoneNumber);
    message_to_send.text.body = `Hello, ${ sender_name }. Your message was: ${ message_text }\nIt was received successfully.`;
    return message_to_send;
};

const createListMessage = (senderPhoneNumber, sender_name, message_text) => {
    const message_to_send = setListMessageObject(senderPhoneNumber);
    message_to_send.interactive.action.sections = setMessageListSections();
    message_to_send.interactive.body.text = `Hello, ${ sender_name }. Your message was: ${ message_text }\nIt was received successfully.\nPlease choose an appropriate reply from the list:`;
    return message_to_send;
};

const createAddressMessage = (senderPhoneNumber, sender_name, message_text) => {
    const message_to_send = setAddressMessageObject(senderPhoneNumber, sender_name);
    message_to_send.interactive.body.text = `Hello, ${ sender_name }. Your message was: ${ message_text }\nIt was received successfully.\nPlease provide your address for delivery:`;
    return message_to_send;
};

const createLocationMessage = (senderPhoneNumber, sender_name, message_text) => {
    const message_to_send = setLocationMessageObject(senderPhoneNumber);
    message_to_send.interactive.body.text = `Hello, ${ sender_name }. Your message was: ${ message_text }\nIt was received successfully.\nPlease provide your desired location for delivery:`
    return message_to_send;
};

const createLocationMessageReply = (body, senderPhoneNumber) => {
    const latitude = getLatitudeFromBody(body);
    const longitude = getLongitudeFromBody(body);

    const northOrSouth = getLatitudeDirection(latitude);
    const eastOrWest = getLongitudeDirection(longitude);

    const absoluteLatitude = getAbsoluteLatitude(latitude);
    const absoluteLongitude = getAbsoluteLongitude(latitude);

    const humanReadableDate = getHumanReadableDate(body);

    let address = getAddressFromBody(body);

    const message_to_send = setTextMessageObject(senderPhoneNumber);
    message_to_send.text.body = `Got it! Your location is: ${ absoluteLongitude + "° " + eastOrWest + ", " + absoluteLatitude + "° " + northOrSouth }\nLast updated at: ${ humanReadableDate }\nYour address is: ${ address }`;

    return message_to_send;
};

// verifying if message was received

const messageIsReceived = (req) => {
    return req.body.entry &&
    req.body.entry[0].changes &&
    req.body.entry[0].changes[0].value.messages &&
    req.body.entry[0].changes[0].value.messages[0];
};

// identifying received message type

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

// setting message object for different types of messages

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

const setAddressMessageObject = (senderPhoneNumber, sender_name) => {
    return {
        messaging_product: "whatsapp",
        to: `+${ senderPhoneNumber }`,
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
                        phone_number: `${ senderPhoneNumber.slice(-10) }`
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

// setting list sections and options for interactive list type message

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

const getPhoneNumberIdFromBody = (body) => {
    return body.entry[0].changes[0].value.metadata?.phone_number_id;
};

const getSenderPhoneNumberFromBody = (body) => {
    return body.entry[0].changes[0].value.messages[0].from;
};

const getInteractiveMessageType = (body) => {
    return body.entry[0].changes[0].value.messages[0].interactive;
};

const getLongitudeFromBody = (body) => {
    return body.entry[0].changes[0].value.messages[0].location.longitude;
};

const getLatitudeFromBody = (body) => {
    return body.entry[0].changes[0].value.messages[0].location.latitude;
};

const getSenderNameFromBody = (body) => {
    return body.entry[0].changes[0].value.contacts[0].profile.name;
};

const getReceivedMessageText = (body) => {
    return body.entry[0].changes[0].value.messages[0].text.body;
};

const getHumanReadableDate = (body) => {
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

    return new Intl.DateTimeFormat('en-IN', dateTimeFormatOptions).format(readableDate);
};

const getAddressFromBody = (body) => {
    return body.entry[0].changes[0].value.messages[0].location.address || "Address not provided!";
};

const getOptionChosen = (option_chosen) => {
    return option_chosen.list_reply.id;
};

const getLongitudeDirection = (longitude) => {
    return longitude.toString().charAt(0) === "-" ? "West" : "East"
};

const getLatitudeDirection = (latitude) => {
    return latitude.toString().charAt(0) === "-" ? "South" : "North"
};

const getAbsoluteLongitude = (longitude) => {
    return longitude.toString().replace("-", "")
};

const getAbsoluteLatitude = (latitude) => {
    return latitude.toString().replace("-", "")
};

// extracting last 10 digits of sender number and appending "+" at the beginning, and "-" after country code
// works for all countries with 10-digit phone numbers

const getFormattedNumber = (senderPhoneNumber) => {
    return `+${ senderPhoneNumber.substring(0, senderPhoneNumber.length - 10) }-${ senderPhoneNumber.slice(-10) }`;
};

const printMessageDetails = (sender_name, sender_number, message_text) => {
    console.log(`Sender Name: ${ sender_name }\nSender Number: ${ sender_number }\nReceived Message: ${ message_text }`);
};

export {
    validateWebhook,
    sendOrReceiveMessage
};
