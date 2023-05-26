const express = require("express")
const router = express.Router()
const authController = require("../controller/authController")
const auth = require("../middlewares/auth")
const blogController = require("../controller/blogController")
const commentController = require("../controller/commentController")


//USER

//register
router.post("/register", authController.register)

//login
router.post("/login", authController.login)

//logout
router.post("/logout", auth, authController.logout)

//refresh token
router.get("/refresh", authController.refresh)

//BLOG

//create
router.post("/blog", auth, blogController.create)

//get all blogs
router.get("/blog/all", auth, blogController.getAll)

//get blog by id
router.get("/blog/:id", auth, blogController.getById)

//update
router.put("/blog", auth, blogController.update)

//delete
router.delete("/blog/:id", auth, blogController.delete)

//COMMENT

//create comment 
router.post("/comment", auth, commentController.create)

//read comments by blog id
router.get("/comment/:id", auth, commentController.getById)



module.exports = router