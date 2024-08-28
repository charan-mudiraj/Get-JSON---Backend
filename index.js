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
let errorCount = 0;
const errorCountLimit = 2;

const getValue = async (url, classString, dataType, isSingle, valueType) => {
  let value;
  try {
    if (lastVisitedURL !== url) {
      const res = await axios.get(url);
      console.log("Sd");
      const html = res.data;
      $ = cheerio.load(html);
      lastVisitedURL = url;
      errorCount = 0;
    }
    if (!classString || !url) {
      // default value for empty class strings
      if (isSingle) {
        return null;
      }
      return [null];
    }
    const classesArr = classString
      .trim("")
      .split(" ")
      .filter((cls) => cls !== "");
    const elements = $(`.${classesArr.join(".")}`); // could be one or many elements (with same classes set)
    elements.each((index, element) => {
      let tempValue;
      console.log(valueType);
      switch (valueType) {
        case "innerText":
          tempValue = $(element)
            .contents()
            .filter((index, node) => node.type === "text")
            .text();
          break;
        default:
          tempValue = $(element).attr(valueType);
          break;
      }

      switch (dataType) {
        case "number":
          tempValue = parseInt(tempValue.replace(/[^0-9]/g, ""));
          break;
        case "boolean":
          tempValue = Boolean(tempValue);
          break;
        default:
          tempValue = tempValue.trim("");
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
    return undefined;
  }
  if (value) {
    return value;
  }
};
const getJSON = async (
  urls,
  classes,
  keys,
  types,
  searchTypes,
  valueTypes,
  globalSettings
) => {
  const arr = [];
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const obj = {};
    if (globalSettings.id) {
      obj.id = (i + 1).toString();
    }
    if (globalSettings.url) {
      obj.url = urls[i];
    }
    for (let j = 0; j < classes.length; j++) {
      if (keys[j] === "") {
        keys[j] = "key-" + Number(j + 1);
      }
      const value = await getValue(
        url,
        classes[j],
        types[j],
        searchTypes[j] === "single",
        valueTypes[j]
      );
      if (value === undefined) {
        if (errorCount < errorCountLimit) {
          j -= 1;
          errorCount++;
          continue;
        } else {
          errorCount = 0;
        }
      }
      obj[keys[j]] = value;
    }
    arr.push(obj);
  }
  // clear the cache for next request
  lastVisitedURL = "";
  $ = null;
  errorCount = 0;

  return arr;
};

app.post("/getJSON", async (req, res) => {
  const urls = req.body.urls;
  const classes = req.body.classes;
  const keys = req.body.keys;
  const types = req.body.types; // [string, number, boolean]
  const searchTypes = req.body.searchTypes; // [single, multiple]
  const valueTypes = req.body.valueTypes; // [innerText, href, src]
  const globalSettings = req.body.globalSettings; // {url, id}
  const arr = await getJSON(
    urls,
    classes,
    keys,
    types,
    searchTypes,
    valueTypes,
    globalSettings
  );
  res.json(arr);
});

app.get("/", (req, res) => {
  console.log("got a request");
  res.json({
    status: 200,
    desc: "Backend is Up !",
  });
});

app.listen(8000, () => {
  console.log("listening at PORT: " + 8000);
});
