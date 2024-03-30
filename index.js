const cors = require("cors");
const express = require("express");
const axios = require("axios");
const dotenv = require("dotenv");

const app = express();

app.use(cors());
app.use(express.json());
dotenv.config();
let visitedURL = "";
let html = "";
let isHtmlContainsMore = false; // for arrays
let tempHtml = "";

const getInnerHTML = async (url, classString) => {
  let result;
  try {
    if (visitedURL !== url) {
      const res = await axios.get(url);
      html = res.data;
      visitedURL = url;
    }
    if (!html.includes('"' + classString + '"')) {
      return false;
    }
    const classIndex = html.indexOf('"' + classString + '"');
    let startIndex = classIndex + 1;
    while (html[startIndex++] != ">");
    let endIndex = startIndex + 1;
    while (html[endIndex++] != "<");
    result = html.slice(startIndex, endIndex - 1).trim(" ");
    if (html.slice(endIndex).includes('"' + classString + '"')) {
      if (!tempHtml) {
        tempHtml = html;
      }
      isHtmlContainsMore = true;
      html = html.slice(endIndex);
    } else {
      isHtmlContainsMore = false;
      if (tempHtml) {
        html = tempHtml;
        tempHtml = "";
      }
    }
  } catch (e) {
    // console.log("error");
    return null;
  }
  if (result) {
    return result;
  }
};
const getJSON = async (urls, classes, keys, types, searchTypes) => {
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
        if (searchTypes[j] == "single") {
          obj[keys[j]] = value;
        } else if (!isHtmlContainsMore) {
          if (!(keys[j] in obj)) {
            obj[keys[j]] = value;
          } else {
            obj[keys[j]].push(value);
          }
        } else {
          if (!(keys[j] in obj)) {
            obj[keys[j]] = [value];
          } else {
            obj[keys[j]].push(value);
          }
          j -= 1;
        }
      }
    }
    arr.push(obj);
  }
  visitedURL = "";
  html = "";
  return arr;
};
app.post("/getJSON", async (req, res) => {
  const urls = req.body.urls;
  const classes = req.body.classes;
  const keys = req.body.keys;
  const types = req.body.types; // [string, number, boolean]
  const searchTypes = req.body.searchTypes; // [single, multiple]
  const arr = await getJSON(urls, classes, keys, types, searchTypes);
  res.json(arr);
});
app.get("/", (req, res) => {
  console.log("got a request");
  res.json({
    status: 200,
    desc: "Backend is Up !",
  });
});

app.listen(process.env.PORT, () => {
  console.log("listening at PORT: " + process.env.PORT);
});
