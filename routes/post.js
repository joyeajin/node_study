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

// 이미지 업로드
const { S3Client } = require("@aws-sdk/client-s3");
const { ObjectId } = require("mongodb");
const multer = require("multer");
const multerS3 = require("multer-s3");
const s3 = new S3Client({
  region: "ap-northeast-2",
  credentials: {
    accessKeyId: process.env.S3_KEY,
    secretAccessKey: process.env.S3_SECRET,
  },
});

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: "yeajinforum1",
    key: function (요청, file, cb) {
      cb(null, Date.now().toString()); //업로드시 파일명 변경가능
    },
  }),
});

function checkLogin(요청, 응답, next) {
  if (!요청.user) {
    응답.send("로그인하세요");
  }
  next();
}

//write
router.get("/write", checkLogin, async (요청, 응답) => {
  응답.render("write.ejs", { user: 요청.user });
});

//add
router.post("/add", async (요청, 응답) => {
  // console.log(요청.body);

  upload.single("img1")(요청, 응답, async (err) => {
    if (err) return 응답.send("업로드 에러");
    else {
      try {
        if (요청.body.title === "") {
          응답.send("제목을 입력해주세요.");
        } else {
          await db.collection("post").insertOne({
            title: 요청.body.title,
            content: 요청.body.content,
            img: 요청.file ? 요청.file.location : "",
            user: new ObjectId(요청.user._id),
            username: 요청.user.username,
          });
          응답.redirect("/list");
        }
      } catch (error) {
        console.log(error);
        응답.status(500).send("서버 에러남");
      }
    }
  });
});

router.post("/comment", async (요청, 응답) => {
  await db.collection("comment").insertOne({
    writerId: new ObjectId(요청.user._id),
    writer: 요청.user.username,
    content: 요청.body.content,
    parentId: new ObjectId(요청.body.parentId),
  });
  응답.redirect("back");
});

//detail
router.get("/detail/:id", async (요청, 응답) => {
  try {
    let result = await db
      .collection("post")
      .findOne({ _id: new ObjectId(요청.params.id) });
    // console.log(요청.params.id);
    // console.log(result);

    let commentResult = await db
      .collection("comment")
      .find({ parentId: new ObjectId(요청.params.id) })
      .toArray();
    // console.log("commentResult", commentResult);

    if (result == null || commentResult == null) {
      console.log(error);
    }
    응답.render("detail.ejs", {
      result: result,
      commentResult: commentResult,
      user: 요청.user,
    });
  } catch (error) {
    console.log(error);
    응답.status(400).send("이상한 url입력");
  }
});
// { $set: { title: 요청.body.title, content: 요청.body.content } }

//update
router.get("/update/:id", async (요청, 응답) => {
  let result = await db
    .collection("post")
    .findOne({ _id: new ObjectId(요청.params.id) });
  // console.log(result);

  // console.log(updateResult);
  응답.render("update.ejs", { result: result, user: 요청.user });
});

//update
router.put("/update", async (요청, 응답) => {
  // await db.collection("post").updateOne({ _id: 1 }, { $inc: { like: 1 } });
  // 응답.redirect("/list");
  await db
    .collection("post")
    .updateOne(
      { _id: new ObjectId(요청.body.id), user: new ObjectId(요청.user._id) },
      { $set: { title: 요청.body.title, content: 요청.body.content } }
    );
  응답.redirect("/list");
});

//delete
router.delete("/delete/:id", async (요청, 응답) => {
  // console.log(요청.params);
  await db.collection("post").deleteOne({
    _id: new ObjectId(요청.params.id),
    user: new ObjectId(요청.user._id),
  });
  응답.send("삭제완료");
});

module.exports = router;
