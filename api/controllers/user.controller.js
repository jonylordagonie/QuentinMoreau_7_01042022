require("dotenv").config();
const User = require("../models/user.model");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const tokenkey = process.env.TOKEN;
const userValidation = require("../utils/userValidation.utils");
const userModifyValidation = require("../utils/userModifyValidation.utils");

class UserController {
  getAllUsers = (req, res, next) => {
    const token = req.headers.authorization.split(" ")[1];
    const decodedToken = jwt.verify(token, tokenkey);
    const userId = decodedToken.id
    const role = decodedToken.role;
    if (role === "admin") {
      User.findAll({
        attributes: {
          exclude: ["createdAt", "updatedAt"],
        },
      })
        .then((users) => {
          res.status(200).json(users);
        })
        .catch((error) => res.status(500).json(error));
    } else {
      res.status(401).json({ msg: "Unauthorized request" });
    }
  };

  getUserById = (req, res, next) => {
    const { id } = req.params;
    const token = req.headers.authorization.split(" ")[1];
    const decodedToken = jwt.verify(token, tokenkey);
    const userId = decodedToken.id
    const role = decodedToken.role;
    if (role === "admin" || userId == id) {
      User.findByPk(id, {
        attributes: {
          exclude: ["createdAt", "updatedAt"],
        },
      })
        .then((user) => {
          if (!user) return res.status(404).json({ msg: "User not found !" })
          res.status(200).json(user);
        })
        .catch((error) => res.status(500).json(error));
    } else {
      res.status(401).json({ msg: "Unauthorized request" });
    }
  };

  modifyUser = (req, res, next) => {
    const { id } = req.params;
    const { body } = req;
    const { error } = userModifyValidation(body);
    const token = req.headers.authorization.split(" ")[1];
    const decodedToken = jwt.verify(token, tokenkey);
    const userId = decodedToken.id
    const role = decodedToken.role;
    if (role === "admin" || userId == id) {
      User.findByPk(id)
        .then((user) => {
          if (!user) return res.status(404).json({ msg: "User not found !" });
          if (error) return res.status(401).json(error.details[0].message);
          user.nom = body.nom;
          user.prenom = body.prenom;
          user.email = body.email;
          user
            .save()
            .then(() =>
              res.status(201).json({ msg: "utilisateur modifier avec succès !" })
            )
            .catch((error) => res.status(500).json(error))
        })
        .catch((error) => res.status(500).json(error));
    } else {
      res.status(401).json({ msg: "Unauthorized request" });
    }
  };

  addUser = (req, res, next) => {
    const { body } = req;
    const { error } = userValidation(body);
    const email = req.body.email;
    User.findOne({ where: { email } }).then((user) => {
      if (!user) {
        if (error) {
          if (error.details[0].message.includes("password")) {
            return res
              .status(500)
              .json({
                msg: "Le mot de passe doit contenir au moins 8 caractères dont 1 majuscule, 1 numéro et 1 caractère spécial",
              });
          }
          return res.status(500).json(error.details[0].message);
        }
        bcrypt.hash(req.body.password, 10).then((hash) => {
          User.create({
            ...body,
            password: hash,
          })
            .then(() => res.status(201).json({ msg: "user created !" }))
            .catch((error) => res.status(500).json(error));
        });
      } else {
        res.status(500).json({ msg: "Email déjà utilisé" });
      }
    });
  };

  DeleteUser = (req, res, next) => {
    const { id } = req.params;
    const token = req.headers.authorization.split(" ")[1];
    const decodedToken = jwt.verify(token, tokenkey);
    const userId = decodedToken.id
    const role = decodedToken.role;
    if (role === "admin" || userId == id) {
      User.destroy({ where: { id: id } })
        .then((ressource) => {
          if (ressource === 0)
            return res.status(404).json({ msg: "Not found !" });
          res.status(200).json({ msg: "User delted !" });
        })
        .catch((error) => res.status(500).json(error));
    } else {
      res.status(401).json({ msg: "Unauthorized request" });
    }
  };

  loggin = (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;
    User.findOne({ where: { email: email } })
      .then((user) => {
        if (!user) return res.status(404).json({ msg: "Email not found !" });
        bcrypt
          .compare(password, user.password)
          .then((valid) => {
            if (!valid) {
              return res.status(401).json({ message: "Mot de passe incorrect !" });
            }
          
            return res.status(200).json({ message: "Loggued",
              userId: user.id,
              role: user.role,
              nom: user.nom,
              prenom: user.prenom,
              email: user.email,
              token: jwt.sign(
                {
                  userId: user.id,
                  role: user.role
                },
              tokenkey,
              { expiresIn: "24h", }
              )
            });
          })
          .catch((error) => res.status(500).json({ error }));
      })
      .catch((error) => res.status(500).json({ error }));
  };
}

module.exports = new UserController();
