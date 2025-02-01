const checkHealth = (req, res)=>{
    res.status(200).send("Webhook is running");
}

export { checkHealth };
