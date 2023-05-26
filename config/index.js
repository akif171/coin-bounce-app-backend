const dotenv = require("dotenv").config();

const {
  PORT,
  MONGO_URI,
  ACCESS_TOKEN_SECRET,
  REFRESH_TOKEN_SECRET,
  BACKEND_SERVER_PATH,
  CLOUD_NAME,
  API_KEY,
  API_SECRET,
} = process.env;

module.exports = {
  PORT,
  MONGO_URI,
  ACCESS_TOKEN_SECRET,
  REFRESH_TOKEN_SECRET,
  BACKEND_SERVER_PATH,
  CLOUD_NAME,
  API_KEY,
  API_SECRET,
};
