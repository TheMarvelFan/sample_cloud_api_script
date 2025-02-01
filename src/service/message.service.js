import axios from "axios";
import { asyncHandler } from "../utils/asyncHandler.js";

const sendMessage = asyncHandler(async (message_to_send, phone_number_id) => {
    const url = `https://graph.facebook.com/v21.0/${phone_number_id}/messages`;

    const config = {
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.PERMANENT_ACCESS_TOKEN}`
        }
    };

    let response;

    try {
        response = await axios.post(
            url,
            message_to_send,
            config
        );
    } catch (error) {
        console.log(`Error sending message: ${error}`);
    }

    return response;
});

export { sendMessage };
