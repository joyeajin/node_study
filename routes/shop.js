const router = require("express").Router();

let connectDB = require("./../database.js");
let db;
connectDB
  .then((client) => {
    db = client.db("forum");
  })
  .catch((err) => {
    console.log(err);
  });

router.get("/shirts", async (요청, 응답) => {
  //   console.log(await db.collection("post").find().toArray());
  await db.collection("post").find().toArray();
  응답.send("셔츠 파는 페이지");
});

router.get("/pants", (요청, 응답) => {
  응답.send("바지 파는 페이지");
});

module.exports = router;
