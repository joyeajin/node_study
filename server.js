const { log } = require("console");
const express = require("express");
const app = express();
const methodOverride = require("method-override");
const bcrypt = require("bcrypt");

const { createServer } = require("http");
const { Server } = require("socket.io");
const server = createServer(app);
const io = new Server(server);

require("dotenv").config();

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

const sessionMiddleware = session({
  secret: "암호화에 쓸 비번",
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 60 * 60 * 1000 },
  store: MongoStore.create({
    mongoUrl: process.env.DB_URL,
    dbName: "forum",
  }),
});
app.use(sessionMiddleware);

app.use(passport.initialize());
// app.use(
//   session({
//     secret: "암호화에 쓸 비번",
//     resave: false,
//     saveUninitialized: false,
//     cookie: { maxAge: 60 * 60 * 1000 },
//     store: MongoStore.create({
//       mongoUrl: process.env.DB_URL,
//       dbName: "forum",
//     }),
//   })
// );
app.use(passport.session());

let connectDB = require("./database.js");
let db;
connectDB
  .then((client) => {
    console.log("DB연결성공");
    db = client.db("forum");
    server.listen(process.env.PORT, () => {
      console.log("http://localhost:8081 에서 서버 실행중");
    });
  })
  .catch((err) => {
    console.log(err);
  });

function checkLogin(요청, 응답, next) {
  if (!요청.user) {
    응답.send("로그인하세요");
  }
  next();
}

// function printTime(요청, 응답, next) {
//   console.log(new Date());
//   next();
// }

function checkIdPw(요청, 응답, next) {
  if (요청.body.username == "" || 요청.body.password == "") {
    응답.send("모든 칸 채워주세요");
  } else {
    next();
  }
}

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
  let userId = new ObjectId(요청.user._id);

  // console.log(result[0].title);
  // 응답.send(result[0].title);
  응답.render("list.ejs", { posts: result, userId: userId });
});

app.get("/time", async (요청, 응답) => {
  응답.render("time.ejs", { time: new Date() });
});

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

app.post("/login", checkIdPw, async (요청, 응답, next) => {
  passport.authenticate("local", (error, user, info) => {
    if (error) return 응답.status(500).json(error);
    if (!user) return 응답.status(401).json(info.message);
    요청.logIn(user, (err) => {
      if (err) return next(err);
      응답.redirect("/list");
    });
  })(요청, 응답, next);
});

app.get("/mypage", checkLogin, async (요청, 응답) => {
  // console.log(요청.user);
  if (요청.user) {
    응답.render("mypage.ejs", { userId: 요청.user.username });
  } else {
    응답.send("로그인 필요");
  }
});

app.get("/register", async (요청, 응답) => {
  응답.render("register.ejs");
});

app.post("/register", checkIdPw, async (요청, 응답) => {
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

app.use("/shop", require("./routes/shop.js"));

app.use("/board/sub", checkLogin, require("./routes/board.js"));

app.use("/", require("./routes/post.js"));

app.get("/search", async (요청, 응답) => {
  // console.log(요청.query.val);
  try {
    let 검색조건 = [
      {
        $search: {
          index: "title_index",
          text: { query: 요청.query.val, path: "title" },
        },
      },
    ];
    let result = await db.collection("post").aggregate(검색조건).toArray();
    응답.render("search.ejs", { lists: result });
  } catch (error) {
    console.log(error);
    응답.status(500).send(error);
  }
});

app.get("/chat/request", checkLogin, async (요청, 응답) => {
  // console.log(요청.user);
  await db.collection("chat").insertOne({
    member: [요청.user._id, new ObjectId(요청.query.writerId)],
    date: new Date(),
  });
  응답.redirect("/chat/list");
});

app.get("/chat/list", checkLogin, async (요청, 응답) => {
  let result = await db
    .collection("chat")
    .find({ member: 요청.user._id })
    .toArray();
  // console.log(result);
  응답.render("chatList.ejs", { result: result });
});

io.use((socket, next) => {
  sessionMiddleware(socket.request, {}, next);
});

io.on("connection", (socket) => {
  // socket.on("age", (data) => {
  //   console.log("유저가 보낸거", data);
  //   io.emit("name", "yeajin");
  // });

  // socket.join("1");
  socket.on("ask-join", (data) => {
    // console.log(data);
    // socket.request.session
    if (data) {
      socket.join(data);
    } else {
      alert("로그인 해주세요~~");
    }
  });

  socket.on("message", async (data) => {
    const now = new Date();
    const formattedDate = now.toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    await db.collection("chatMessage").insertOne({
      who: new ObjectId(socket.request.session.passport.user.id),
      content: data.msg,
      parentRoom: new ObjectId(data.room),
      date: formattedDate,
    });

    // console.log(data);

    io.to(data.room).emit("broadcast", {
      msg: data.msg,
      date: formattedDate,
      who: new ObjectId(socket.request.session.passport.user.id),
    });
  });
});

app.get("/chat/detail/:id", checkLogin, async (요청, 응답) => {
  let chatId = new ObjectId(요청.params.id);
  // console.log(요청.user);

  if (요청.user && 요청.user._id) {
    let userId = new ObjectId(요청.user._id);
    let isMember = await db.collection("chat").findOne({ member: userId });
    // console.log(isMember);
    if (isMember) {
      let result = await db.collection("chat").findOne({ _id: chatId });
      //     // console.log(result);

      let chatResult = await db
        .collection("chatMessage")
        .find({ parentRoom: chatId })
        .toArray();
      응답.render("chatDetail.ejs", {
        result: result,
        chatResult: chatResult,
        userId: 요청.user._id,
      });
    }
  } else {
    응답.send("본인 채팅이 아니면 못봄");
  }
});
