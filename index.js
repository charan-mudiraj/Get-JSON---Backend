const cors = require("cors");
const express = require("express");
const axios = require("axios");
const dotenv = require("dotenv");

const app = express();

app.use(cors());
app.use(express.json());
dotenv.config();

const getJSON = async (url, className) => {
  const res = await axios.get(url);
  const data = res.data;
  const index = data.indexOf(className);
  return data.substr(index, className.length + 30);
};
app.post("/getJSON", async (req, res) => {
  const url = req.body.url;
  const className = req.body.className;
  const data = await getJSON(url, className);
  res.json({ data: data });
});

app.listen(process.env.PORT, () => {
  console.log("listening at PORT: " + process.env.PORT);
});
