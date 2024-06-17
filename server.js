const { log } = require("console");
const express = require("express");
const app = express();
const methodOverride = require("method-override");

app.use(methodOverride("_method"));
app.use(express.static(__dirname + "/public"));
app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const { MongoClient, ObjectId } = require("mongodb");

let db;
const url =
  "mongodb+srv://dpwls31200:ne7Y5kEeKRR6njqj@cluster0.8dno1mv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
new MongoClient(url)
  .connect()
  .then((client) => {
    console.log("DB연결성공");
    db = client.db("forum");
    app.listen(8081, () => {
      console.log("http://localhost:8081 에서 서버 실행중");
    });
  })
  .catch((err) => {
    console.log(err);
  });

app.get("/", (요청, 응답) => {
  응답.sendFile(__dirname + "/index.html");
});

app.get("/news", (요청, 응답) => {
  //   db.collection("post").insertOne({ title: "ddd" });
  응답.send("오늘 비옴d");
});

app.get("/about", (요청, 응답) => {
  응답.sendFile(__dirname + "/about.html");
});

app.get("/list", async (요청, 응답) => {
  let result = await db.collection("post").find().toArray();
  // console.log(result[0].title);
  // 응답.send(result[0].title);
  응답.render("list.ejs", { posts: result });
});

app.get("/time", async (요청, 응답) => {
  응답.render("time.ejs", { time: new Date() });
});

app.get("/write", async (요청, 응답) => {
  응답.render("write.ejs");
});

app.post("/add", async (요청, 응답) => {
  console.log(요청.body);

  try {
    if (요청.body.title === "") {
      응답.send("제목을 입력해주세요.");
    } else {
      await db.collection("post").insertOne({
        title: 요청.body.title,
        content: 요청.body.content,
      });
      응답.redirect("/list");
    }
  } catch (error) {
    console.log(error);
    응답.status(500).send("서버 에러남");
  }
});

app.get("/detail/:id", async (요청, 응답) => {
  try {
    let result = await db
      .collection("post")
      .findOne({ _id: new ObjectId(요청.params.id) });
    // console.log(요청.params.id);
    // console.log(result);
    if (result == null) {
      console.log(error);
    }
    응답.render("detail.ejs", { result: result });
  } catch (error) {
    console.log(error);
    응답.status(400).send("이상한 url입력");
  }
});
// { $set: { title: 요청.body.title, content: 요청.body.content } }
app.get("/update/:id", async (요청, 응답) => {
  let result = await db
    .collection("post")
    .findOne({ _id: new ObjectId(요청.params.id) });
  // console.log(result);

  // console.log(updateResult);
  응답.render("update.ejs", { result: result });
});

app.put("/update", async (요청, 응답) => {
  // await db.collection("post").updateOne({ _id: 1 }, { $inc: { like: 1 } });
  // 응답.redirect("/list");
  await db
    .collection("post")
    .updateOne(
      { _id: new ObjectId(요청.body.id) },
      { $set: { title: 요청.body.title, content: 요청.body.content } }
    );
  응답.redirect("/list");
});

app.delete("/delete/:id", async (요청, 응답) => {
  // console.log(요청.params);
  await db.collection("post").deleteOne({ _id: new ObjectId(요청.params.id) });
  응답.send("삭제완료");
});

// app.get("/list/1", async (요청, 응답) => {
//   //1번~5번글을 찾아서 result 변수에 저장
//   let result = await db.collection("post").find().limit(5).toArray();
//   응답.render("list.ejs", { posts: result });
// });

// app.get("/list/2", async (요청, 응답) => {
//   //6번~10번글을 찾아서 result 변수에 저장
//   let result = await db.collection("post").find().skip(5).limit(5).toArray();
//   응답.render("list.ejs", { posts: result });
// });

// app.get("/list/3", async (요청, 응답) => {
//   let result = await db.collection("post").find().skip(10).limit(5).toArray();
//   응답.render("list.ejs", { posts: result });
// });

// app.get("/list/:id", async (요청, 응답) => {
//   let result = await db
//     .collection("post")
//     .find()
//     .skip((요청.params.id - 1) * 5)
//     .limit(5)
//     .toArray();
//   응답.render("list.ejs", { posts: result });
// });

app.get("/list/next/:id", async (요청, 응답) => {
  let result = await db
    .collection("post")
    .find({ _id: { $gt: new ObjectId(요청.params.id) } })
    .limit(5)
    .toArray();
  응답.render("list.ejs", { posts: result });
});
