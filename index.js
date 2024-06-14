const cors = require("cors");
const express = require("express");
const axios = require("axios");
const dotenv = require("dotenv");
const cheerio = require("cheerio");

const app = express();

app.use(cors());
app.use(express.json());
dotenv.config();
let lastVisitedURL = "";
let $ = null; // parsed html

const getValue = async (url, classString, dataType, isSingle) => {
  let value;
  try {
    if (lastVisitedURL !== url) {
      const res = await axios.get(url);
      const html = res.data;
      $ = cheerio.load(html);
      lastVisitedURL = url;
    }
    if (!classString || !url) {
      // default value for empty class strings
      if (isSingle) {
        return null;
      }
      return [null];
    }
    const classesArr = classString.split(" ").filter((cls) => cls !== "");
    const elements = $(`.${classesArr.join(".")}`); // could be one or many elements (with same classes set)
    elements.each((index, element) => {
      const directText = $(element)
        .contents()
        .filter((index, node) => node.type === "text")
        .text();
      let tempValue;
      switch (dataType) {
        case "number":
          tempValue = parseInt(directText.replace(/[^0-9]/g, ""));
          break;
        case "boolean":
          tempValue = Boolean(directText);
          break;
        default:
          tempValue = directText.trim("");
      }
      if (isSingle) {
        value = tempValue;
        return false; // break out of the loop
      }
      if (Array.isArray(value)) {
        value.push(tempValue);
      } else {
        value = [tempValue];
      }
    });
  } catch (e) {
    // console.log("error");
    if (isSingle) {
      return null;
    }
    return [null];
  }
  if (value) {
    return value;
  }
};
const getJSON = async (urls, classes, keys, types, searchTypes) => {
  const arr = [];
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const obj = {};
    for (let j = 0; j < classes.length; j++) {
      if (keys[j] === "") {
        keys[j] = "key-" + Number(j + 1);
      }
      const value = await getValue(
        url,
        classes[j],
        types[j],
        searchTypes[j] === "single"
      );
      obj[keys[j]] = value;
    }
    arr.push(obj);
  }
  lastVisitedURL = "";
  $ = null;
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
