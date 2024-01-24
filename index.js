const cors = require("cors");
const express = require("express");
const axios = require("axios");
const dotenv = require("dotenv");

const app = express();

app.use(cors());
app.use(express.json());
dotenv.config();

const getInnerHTML = async (url, classString) => {
  let result;
  try {
    const res = await axios.get(url);
    const data = res.data;
    if (!data.includes('"' + classString + '"')) {
      return false;
    }
    const classIndex = data.indexOf('"' + classString + '"');
    let startIndex = classIndex + 1;
    while (data[startIndex++] != ">");
    let endIndex = startIndex + 1;
    while (data[endIndex++] != "<");
    result = data.slice(startIndex, endIndex - 1).trim(" ");
  } catch (e) {
    // console.log("error");
    return null;
  }
  if (result) {
    return result;
  }
};
const getJSON = async (urls, classes, keys, types) => {
  const arr = [];
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    if (url === "") {
      continue;
    }
    const obj = {};
    for (let j = 0; j < classes.length; j++) {
      if (classes[j] === "") {
        continue;
      }
      if (keys[j] === "") {
        keys[j] = "key-" + Number(j + 1);
      }
      const innerHtml = await getInnerHTML(url, classes[j]);
      if (innerHtml === false) {
        continue;
      } else if (innerHtml === null || innerHtml[0] === "<") {
        j -= 1;
      } else {
        let value;
        switch (types[j]) {
          case "number":
            value = parseInt(innerHtml.replace(/[^0-9]/g, ""));
            break;
          case "boolean":
            value = Boolean(innerHtml);
            break;
          default:
            value = innerHtml;
        }
        obj[keys[j]] = value;
      }
    }
    arr.push(obj);
  }
  return arr;
};
app.post("/getJSON", async (req, res) => {
  const urls = req.body.urls;
  const classes = req.body.classes;
  const keys = req.body.keys;
  const types = req.body.types;
  const arr = await getJSON(urls, classes, keys, types);
  res.json(arr);
});
app.get("/", (req, res) => {
  res.send("this is backend");
});

app.listen(process.env.PORT, () => {
  console.log("listening at PORT: " + process.env.PORT);
});
