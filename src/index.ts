import app from "./app.js";

const PORT = process.env.EXPOSED_PORT || 8000;

app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});
