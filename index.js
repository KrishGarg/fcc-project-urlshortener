const express = require("express");
const cors = require("cors");
const { Deta } = require("deta");
const validUrl = require("valid-url");
const { URL } = require("url");

const app = express();

if (!process.env.DETA_RUNTIME) {
  require("dotenv").config();
}

const deta = Deta();
const base = deta.Base("urlshortner");

const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.urlencoded({ extended: false }));

app.use("/public", express.static(`${process.cwd()}/public`));

app.get("/", function (req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

app.post("/api/shorturl", async (req, res) => {
  if (!req.body.url) {
    return res.json({ error: "Invalid URL" });
  }
  const id = await createAndGetShortUrl(req.body.url);
  if (id === null) {
    return res.json({ error: "Invalid URL" });
  }
  return res.json({
    original_url: req.body.url,
    short_url: id,
  });
});

app.get("/api/shorturl/:id", async (req, res) => {
  const longURL = await getLongURL(req.params.id);
  if (!longURL) {
    return res.json({ error: "Invalid URL" });
  }
  return res.redirect(longURL);
});

function validateURL(url, protocols = ["http", "https"]) {
  try {
    const url = new URL(s);
    return protocols
      ? url.protocol
        ? protocols.map((x) => `${x.toLowerCase()}:`).includes(url.protocol)
        : false
      : true;
  } catch (err) {
    return false;
  }
}

async function getAndUpdateCount() {
  const result = await base.get("counter");
  if (result === null) {
    await base.put({
      key: "counter",
      count: 1,
    });
    return 1;
  }
  await base.put({
    key: "counter",
    count: result.count + 1,
  });
  return result.count + 1;
}

async function createAndGetShortUrl(url) {
  if (!validateURL(url)) {
    return null;
  }
  const { items } = await base.fetch({
    url,
  });

  if (items.length > 0) {
    return items[0].key;
  }
  const id = await getAndUpdateCount();
  await base.put({
    key: id.toString(),
    url,
  });
  return id;
}

async function getLongURL(id) {
  return (await base.get(id.toString()))?.url;
}

if (!process.env.DETA_RUNTIME) {
  app.listen(port, function () {
    console.log(`Listening on port http://localhost:${port}`);
  });
}

module.exports = app;
