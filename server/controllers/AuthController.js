import jwt from "jsonwebtoken";
import User from "../model/UserModel.js";
import { compare } from "bcrypt";
import { renameSync, unlinkSync } from "fs";

// Use a consistent JWT key from environment variables
const JWT_KEY = process.env.JWT_KEY || "default_secret_key";
const maxAge = 3 * 24 * 60 * 60 * 1000; // 3 days

const createToken = (email, userId) => {
  return jwt.sign({ email, userId }, JWT_KEY, {
    expiresIn: maxAge,
  });
};

export const signup = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    console.log(`Signup attempt for email: ${email}`);

    if (email && password) {
      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        console.log(`User already exists with email: ${email}`);
        return res.status(400).send("User already exists");
      }

      console.log(`Creating new user with email: ${email}`);
      const user = await User.create({ email, password });
      console.log(`User created successfully: ${user.id}`);

      res.cookie("jwt", createToken(email, user.id), {
        maxAge,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        path: "/",
      });

      return res.status(201).json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          image: user.image,
          profileSetup: user.profileSetup,
        },
      });
    } else {
      return res.status(400).send("Email and Password Required");
    }
  } catch (err) {
    console.error("Signup error:", err);
    return res.status(500).send("Internal Server Error");
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    console.log(`Login attempt for email: ${email}`);

    if (email && password) {
      const user = await User.findOne({ email });
      if (!user) {
        console.log(`User not found for email: ${email}`);
        return res.status(404).send("User not found");
      }

      console.log(`User found: ${user.id}, comparing passwords...`);
      const auth = await compare(password, user.password);
      console.log(`Password comparison result: ${auth}`);

      if (!auth) {
        console.log(`Invalid password for user: ${user.id}`);
        return res.status(400).send("Invalid Password");
      }

      console.log(`Login successful for user: ${user.id}`);
      res.cookie("jwt", createToken(email, user.id), {
        maxAge,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        path: "/",
      });
      return res.status(200).json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          image: user.image,
          profileSetup: user.profileSetup,
        },
      });
    } else {
      return res.status(400).send("Email and Password Required");
    }
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).send("Internal Server Error");
  }
};

export const getUserInfo = async (request, response, next) => {
  try {
    if (request.userId) {
      const userData = await User.findById(request.userId);
      if (userData) {
        return response.status(200).json({
          id: userData.id,
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          image: userData.image,
          profileSetup: userData.profileSetup,
          color: userData.color,
        });
      } else {
        return response.status(404).send("User with the given id not found.");
      }
    } else {
      return response.status(404).send("User id not found.");
    }
  } catch (error) {
    console.log({ error });
    return response.status(500).send("Internal Server Error");
  }
};

export const logout = async (request, response, next) => {
  try {
    response.cookie("jwt", "", {
      maxAge: 1,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/",
    });
    return response.status(200).send("Logout successful");
  } catch (err) {
    return response.status(500).send("Internal Server Error");
  }
};

export const updateProfile = async (request, response, next) => {
  try {
    const { userId } = request;

    const { firstName, lastName, color } = request.body;

    if (!userId) {
      return response.status(400).send("User ID is required.");
    }

    if (!firstName || !lastName) {
      return response.status(400).send("Firstname and Last name is required.");
    }

    const userData = await User.findByIdAndUpdate(
      userId,
      {
        firstName,
        lastName,
        color,
        profileSetup: true,
      },
      {
        new: true,
        runValidators: true,
      }
    );
    return response.status(200).json({
      id: userData.id,
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      image: userData.image,
      profileSetup: userData.profileSetup,
      color: userData.color,
    });
  } catch (error) {
    return response.status(500).send("Internal Server Error.");
  }
};

export const addProfileImage = async (request, response, next) => {
  try {
    if (request.file) {
      const date = Date.now();
      let fileName = "uploads/profiles/" + date + request.file.originalname;
      renameSync(request.file.path, fileName);
      const updatedUser = await User.findByIdAndUpdate(
        request.userId,
        { image: fileName },
        {
          new: true,
          runValidators: true,
        }
      );
      return response.status(200).json({ image: updatedUser.image });
    } else {
      return response.status(404).send("File is required.");
    }
  } catch (error) {
    console.log({ error });
    return response.status(500).send("Internal Server Error.");
  }
};

export const removeProfileImage = async (request, response, next) => {
  try {
    const { userId } = request;

    if (!userId) {
      return response.status(400).send("User ID is required.");
    }

    const user = await User.findById(userId);

    if (!user) {
      return response.status(404).send("User not found.");
    }

    if (user.image) {
      unlinkSync(user.image);
    }

    user.image = null;
    await user.save();

    return response
      .status(200)
      .json({ message: "Profile image removed successfully." });
  } catch (error) {
    console.log({ error });
    return response.status(500).send("Internal Server Error.");
  }
};
