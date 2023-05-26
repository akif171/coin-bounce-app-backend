const Joi = require("joi");
const User = require("../models/user");
const bcrypt = require("bcryptjs");
const UserDTO = require("../dto/user");
const JWTservice = require("../services/JWTservices");
const RefreshToken = require("../models/token");

const passwordPattern = new RegExp(
  "^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{8,25})"
);

const authController = {
  async register(req, res, next) {
    // 1. validate user input
    const userRegisterSchema = Joi.object({
      name: Joi.string().max(30).required(),
      username: Joi.string().min(5).max(30).required(),
      email: Joi.string().email().required(),
      password: Joi.string().pattern(passwordPattern).required(),
      confirmPassword: Joi.ref("password"),
    });

    const { error } = userRegisterSchema.validate(req.body);

    // 2. if error in validation -> return error via middleware
    if (error) {
      return next(error);
    }

    // 3. if email or username is already registered -> return an error

    const { name, username, email, password } = req.body;

    try {
      const isEmailExist = await User.exists({ email });

      const isUsernameExist = await User.exists({ username });

      if (isEmailExist) {
        const error = {
          status: 409,
          message: "Email already registered, use another email.",
        };

        return next(error);
      }

      if (isUsernameExist) {
        const error = {
          status: 409,
          message: "Username is not available.",
        };

        return next(error);
      }
    } catch (error) {
      return next(error);
    }

    // 4. password hash
    const hashedPassword = await bcrypt.hash(password, 10);

    // 5. store user data in db
    let user;
    let accessToken;
    let refreshToken;

    try {
      const userToRegister = new User({
        name,
        username,
        email,
        password: hashedPassword,
      });

      user = await userToRegister.save();

      accessToken = JWTservice.signAccessToken({ _id: user._id }, "30m");
      refreshToken = JWTservice.signRefreshToken({ _id: user._id }, "60m");
    } catch (error) {
      return next(error);
    }

    //store refresh token in db
    await JWTservice.storeRefreshToken(refreshToken, user._id);

    // send token in cookie
    res.cookie("accessToken", accessToken, {
      maxAge: 1000 * 60 * 60 * 24,
      httpOnly: true,
      sameSite: "None",
      secure: true,
    });

    res.cookie("refreshToken", refreshToken, {
      maxAge: 1000 * 60 * 60 * 24,
      httpOnly: true,
      sameSite: "None",
      secure: true,
    });

    // 6. send response
    const userDto = new UserDTO(user);

    return res.status(201).json({ user: userDto, auth: true });
  },
  async login(req, res, next) {
    // 1. validate user input
    const userLoginSchema = Joi.object({
      username: Joi.string().min(5).max(30).required(),
      password: Joi.string().pattern(passwordPattern),
    });

    const { error } = userLoginSchema.validate(req.body);

    // 2. if validation error reurn error

    if (error) {
      return next(error);
    }

    // 3. match username and password

    const { username, password } = req.body;

    let user;

    try {
      //match username
      user = await User.findOne({ username });

      if (!user) {
        const error = {
          status: 401,
          message: "Invalid username!",
        };

        return next(error);
      }

      // match password
      const matchPassword = await bcrypt.compare(password, user.password);

      if (!matchPassword) {
        const error = {
          status: 401,
          message: "Invalid password!",
        };

        return next(error);
      }
    } catch (error) {
      return next(error);
    }

    // 4. return response

    // Create tokens
    const accessToken = JWTservice.signAccessToken({ _id: user._id }, "30m");
    const refreshToken = JWTservice.signRefreshToken({ _id: user._id }, "60m");

    // Update refreshToken
    try {
      await RefreshToken.updateOne(
        { _id: user._id },
        { token: refreshToken },
        { upsert: true }
      );
    } catch (error) {
      return next(error);
    }

    res.cookie("accessToken", accessToken, {
      maxAge: 1000 * 60 * 60 * 24,
      httpOnly: true,
      sameSite: "None",
      secure: true,
    });

    res.cookie("refreshToken", refreshToken, {
      maxAge: 1000 * 60 * 60 * 24,
      httpOnly: true,
      sameSite: "None",
      secure: true,
    });

    const userDto = new UserDTO(user);

    return res.status(200).json({ user: userDto, auth: true });
  },
  async logout(req, res, next) {
    // 1. delete refresh token from db
    const { refreshToken } = req.cookies;

    try {
      await RefreshToken.deleteOne({ token: refreshToken });
    } catch (error) {
      return next(error);
    }

    // 2. clear cookie
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");

    // 3. send response
    res.status(200).json({ user: null, auth: false });
  },
  async refresh(req, res, next) {
    // 1. get refreshToken from cookies

    const originalRefreshToken = req.cookies.refreshToken;

    // 2. verify refreshToken
    let id;

    try {
      id = JWTservice.verifyRefreshToken(originalRefreshToken)._id;
    } catch (err) {
      const error = {
        status: 401,
        message: "Unauthorized",
      };
      return next(error);
    }

    try {
      const match = await RefreshToken.findOne({
        _id: id,
        token: originalRefreshToken,
      });

      if (!match) {
        const error = {
          status: 401,
          message: "Unauthorized",
        };

        return next(error);
      }
    } catch (err) {
      return next(err);
    }

    // 3. generate new tokens
    try {
      const accessToken = JWTservice.signAccessToken({ _id: id }, "30m");
      const refreshToken = JWTservice.signRefreshToken({ _id: id }, "60m");

      await RefreshToken.updateOne({ _id: id }, { token: refreshToken });

      res.cookie("accessToken", accessToken, {
        maxAge: 1000 * 60 * 60 * 24,
        httpOnly: true,
        sameSite: "None",
        secure: true,
      });

      res.cookie("refreshToken", refreshToken, {
        maxAge: 1000 * 60 * 60 * 24,
        httpOnly: true,
        sameSite: "None",
        secure: true,
      });
    } catch (error) {
      return next(error);
    }
    // 4. update db, return response

    const user = await User.findOne({ _id: id });

    const userDto = new UserDTO(user);

    return res.status(200).json({ user: userDto, auth: true });
  },
};

module.exports = authController;
