const { log } = require("console");
const express = require("express");
const app = express();
const methodOverride = require("method-override");
const bcrypt = require("bcrypt");

app.use(methodOverride("_method"));
app.use(express.static(__dirname + "/public"));
app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const { MongoClient, ObjectId } = require("mongodb");

const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const MongoStore = require("connect-mongo");

app.use(passport.initialize());
app.use(
  session({
    secret: "암호화에 쓸 비번",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 60 * 60 * 1000 },
    store: MongoStore.create({
      mongoUrl:
        "mongodb+srv://dpwls31200:ne7Y5kEeKRR6njqj@cluster0.8dno1mv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0",
      dbName: "forum",
    }),
  })
);
app.use(passport.session());

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
  // console.log(요청.user);

  if (요청.user == null || 요청.user == undefined || 요청.user == "") {
    응답.send("로그인 하세요");
  } else {
    응답.render("write.ejs");
  }
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

app.get("/list/:id", async (요청, 응답) => {
  let result = await db
    .collection("post")
    .find()
    .skip((요청.params.id - 1) * 5)
    .limit(5)
    .toArray();
  응답.render("list.ejs", { posts: result });
});

// 다음버튼
app.get("/list/next/:id", async (요청, 응답) => {
  let result = await db
    .collection("post")
    .find({ _id: { $gt: new ObjectId(요청.params.id) } })
    .limit(5)
    .toArray();
  응답.render("list.ejs", { posts: result });
});

// 이전버튼
app.get("/list/previous/:id", async (요청, 응답) => {
  let result = await db
    .collection("post")
    .find({ _id: { $lt: new ObjectId(요청.params.id) } })
    .sort({ _id: -1 }) //내림차순 정렬
    .limit(5)
    .toArray();

  result.reverse(); //결과를 다시 오름차순으로 정렬
  응답.render("list.ejs", { posts: result });
});

passport.use(
  new LocalStrategy(async (입력한아이디, 입력한비번, cb) => {
    let result = await db
      .collection("user")
      .findOne({ username: 입력한아이디 });

    if (!result) {
      return cb(null, false, { message: "아이디 DB에 없음" });
    }

    if (await bcrypt.compare(입력한비번, result.password)) {
      return cb(null, result);
    } else {
      return cb(null, false, { message: "비번불일치" });
    }
  })
);

passport.serializeUser((user, done) => {
  // console.log(user);
  process.nextTick(() => {
    done(null, { id: user._id, username: user.username });
  });
});

passport.deserializeUser(async (user, done) => {
  let result = await db
    .collection("user")
    .findOne({ _id: new ObjectId(user.id) });
  // delete result.password;
  process.nextTick(() => {
    done(null, result);
  });
});

app.get("/login", async (요청, 응답) => {
  응답.render("login.ejs");
});

app.post("/login", async (요청, 응답, next) => {
  passport.authenticate("local", (error, user, info) => {
    if (error) return 응답.status(500).json(error);
    if (!user) return 응답.status(401).json(info.message);
    요청.logIn(user, (err) => {
      if (err) return next(err);
      응답.redirect("/list");
    });
  })(요청, 응답, next);
});

app.get("/mypage", async (요청, 응답) => {
  // console.log(요청.user);
  if (요청.user) {
    응답.render("mypage.ejs", { userId: 요청.user.username });
  }
});

app.get("/register", async (요청, 응답) => {
  응답.render("register.ejs");
});

app.post("/register", async (요청, 응답) => {
  let hash = await bcrypt.hash(요청.body.password, 10);
  // let userId = { username: 요청.body.username };
  const checkId = await db
    .collection("user")
    .findOne({ username: 요청.body.username });
  // console.log(checkId);

  if (checkId == null) {
    await db
      .collection("user")
      .insertOne({ username: 요청.body.username, password: hash });
    응답.redirect("/list");
  } else {
    응답.send("중복된 아이디");
  }
});
