const mongoose = require("mongoose")
const {MONGO_URI} = require("../config/index")


const connectDB = async () => {
    try {
        const conn = await mongoose.connect(MONGO_URI)
        console.log(`database connected to host: ${conn.connection.host}`);

    } catch (error) {
        console.log(`Error: ${error}`);
    }
}

module.exports = connectDB