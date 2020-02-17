const express = require("express");
const bcrypt = require("bcryptjs");
const router = express.Router();

const User = require("../db/user");

router.get("/", (req, res) => {
  res.json({ message: "🔐" });
});

const validUser = user => {
  const validEmail = typeof user.email === "string" && user.email.trim() != "";
  const validPassword =
    typeof user.password === "string" &&
    user.password.trim() != "" &&
    user.password.trim().length >= 6;
  return validEmail && validPassword;
};

function setUserIdCookie(req, res, id) {
  const isSecure = req.app.get("env") !== "development";
  res.cookie("user_id", id, {
    httpOnly: true,
    signed: true,
    secure: isSecure
  });
}

router.post("/signup", (req, res, next) => {
  if (validUser(req.body)) {
    const { password, email } = req.body;
    User.getOneByEmail(email).then(user => {
      if (!user) {
        bcrypt.hash(password, 8, (err, hash) => {
          if (err) return next(new Error("Bcrypt hash failed"));
          User.create({
            email,
            password: hash,
            created_at: new Date(),
            is_active: true
          }).then(id => {
            setUserIdCookie(req, res, id);
            res.json({
              message: "✅ email not being used",
              id
            });
          });
        });
      } else {
        res.json({ user, message: "❌ email being used" });
      }
    });
  } else {
    next(new Error("Invalid user"));
  }
});

router.post("/login", (req, res, next) => {
  if (validUser(req.body)) {
    const { password, email } = req.body;
    User.getOneByEmail(email).then(user => {
      if (user) {
        bcrypt.compare(password, user.password, (err, valid) => {
          if (err) return next(new Error("Bcrypt compare failed"));
          if (valid) {
            setUserIdCookie(req, res, user.id);
            res.json({ id: user.id, message: "✅ valid login" });
          } else {
            res.status(401);
            next(new Error("❌ password invalid"));
          }
        });
      } else {
        res.status(401);
        next(new Error("❌ email invalid"));
      }
    });
  } else {
    res.status(401);
    next(new Error("Invalid user"));
  }
});

router.get("/logout", (req, res, next) => {
  res.clearCookie("user_id");
  res.json({ message: "🔐 logged out" });
});

module.exports = router;
