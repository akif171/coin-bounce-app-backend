const express = require("express");
const app = express();
const connectDB = require("./database/index");
const router = require("./routes/index");
const errorHandler = require("./middlewares/errorHandler");
const cookieParser = require("cookie-parser");
const cors = require("cors");

const port = process.env.PORT || 5000;

// const corsOptions = {
//   credentials: true,
//   origin: ["http://localhost:3000"],
// };

app.use(cookieParser());

// app.use(cors(corsOptions));

app.use(
  cors({
    origin: function (origin, callback) {
      return callback(null, true);
    },
    optionsSuccessStatus: 200,
    credentials: true,
  })
);

app.use(express.json({ limit: "50mb" }));
app.use(router);

connectDB();

app.use(errorHandler);

// app.use("/storage", express.static("storage"));

app.listen(port, console.log(`server is running on port: ${port}`));
