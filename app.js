require('dotenv').config()
const express = require("express");
const ejs = require("ejs");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const app = express();
const session = require("express-session");
const mongoDbSession = require("connect-mongodb-session")(session);
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
//conecting mongodb to database

mongoose.connect('mongodb://localhost:27017').then(() => {
  console.log("DB connected!");
});

// b1VUW9i70uewrOQX
const store = new mongoDbSession({
  uri: 'mongodb://localhost:27017',
  collection: "sessions",
});

app.use(
  session({
    secret: "This is The biggest Secret",
    resave: false,
    saveUninitalised: false,
    store: store,
  })
);

//creating schema

const todoSchema = new mongoose.Schema({
  title: { type: String, required: true },
  dueDate: { type: String },
  addedBy: { type: String },
});
// role 0 means that the user is normal user, if its 1 then its admin
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: { type: Number, default: 0 },
});

//model

const Todos = mongoose.model("todos", todoSchema);
const Users = mongoose.model("users", userSchema);

//middleware
const isAuthenticate = (req, res, next) => {
  if (req.session.isAuth == true) {
    next();
  } else {
    res.redirect("/login");
  }
};

const isAdmin = (req, res, next) => {
  if (req.session.isAdmin == true) {
    next();
  } else {
    res.redirect("/login");
  }
};
app.get("/", (req, res) => {
  res.render("Welcome");
});
app.get("/login", (req, res) => {
  res.render("login");
});
app.get("/register", (req, res) => {
  res.render("register");
});
app.get("/usernotexist", (req, res) => {
  res.render("usernotexist");
});
app.get("/error", (req, res) => {
  res.render("error");
});
app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/login");
});
app.post("/add-user", async (req, res) => {
  let { name, email, password } = req.body;
  let data = new Users({
    name: name,
    email: email,
    password: await bcrypt.hash(password, 9),
  });
  await data.save();
  res.redirect("/login");
});
app.post("/auth", async (req, res) => {
  let { email, password } = req.body;
  let user = await Users.findOne({ email: email });
  if (user) {
    let isPasswordValid = await bcrypt.compare(password, user.password);
    if (isPasswordValid) {
      if (user.role == 0) {
        req.session.isAuth = true;
        req.session.user = user;
        res.redirect("/todos");
      } else if (user.role == 1) {
        req.session.isAuth = true;
        req.session.user = user;
        req.session.isAdmin = true;
        res.redirect("/dashboard");
      } else {
        res.redirect("/login");
      }
    } else {
      res.redirect("/usernotexist");
    }
  } else {
    res.redirect("/usernotexist");
  }
});

app.get("/todos", isAuthenticate, async (req, res) => {
  let todos = await Todos.find({ addedBy: req.session.user.email });
  todos.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  res.render("index", { todos: todos, user: req.session.user });
});
app.post("/add-task", async (req, res) => {
  let { todo } = req.body;
  let { dueDate } = req.body;
  let data = new Todos({
    title: todo,
    dueDate: dueDate,
    addedBy: req.session.user.email,
  });
  await data.save();
  res.redirect("/todos");
});
app.post("/delete-user", async (req, res) => {
  let email = req.body.email;
  let data = await Users.deleteOne({ email: email });
  let todosdata = await Todos.deleteMany({ addedBy: email });
  res.redirect("/dashboard");
});

app.post("/delete", async (req, res) => {
  const checked = req.body.btndelete;
  let data = await Todos.deleteOne({ title: checked });
  res.redirect("/todos");
});

app.get("/dashboard", isAdmin, async (req, res) => {
  let users = await Users.find({ role: 0 });
  res.render("dashboard", { user: req.session.user, users: users });
});
app.listen( process.env.PORT, () => {
  console.log("console is running on 8000");
});
