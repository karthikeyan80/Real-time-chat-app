import mongoose from "mongoose";
import { genSalt, hash, compare } from "bcrypt";

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, "Email is Required"],
    unique: true,
  },
  password: {
    type: String,
    required: [true, "Password is Required"],
  },
  firstName: {
    type: String,
    required: false,
  },
  lastName: {
    type: String,
    required: false,
  },
  image: {
    type: String,
    required: false,
  },
  profileSetup: {
    type: Boolean,
    default: false,
  },
  color: {
    type: Number,
    required: false,
  },
});

// Only hash the password if it's been modified or is new
userSchema.pre("save", async function (next) {
  // Skip if the password hasn't been modified
  if (!this.isModified("password")) return next();

  try {
    console.log("Hashing password for user:", this.email);
    const salt = await genSalt(10); // Use a consistent salt rounds value
    this.password = await hash(this.password, salt);
    console.log("Password hashed successfully");
    next();
  } catch (error) {
    console.error("Error hashing password:", error);
    next(error);
  }
});

userSchema.statics.login = async function (email, password) {
  try {
    console.log(`Static login attempt for email: ${email}`);
    const user = await this.findOne({ email });
    if (user) {
      console.log(`User found: ${user.id}, comparing passwords...`);
      const auth = await compare(password, user.password);
      console.log(`Password comparison result: ${auth}`);
      if (auth) {
        return user;
      }
      throw Error("incorrect password");
    }
    throw Error("incorrect email");
  } catch (error) {
    console.error("Error in static login:", error);
    throw error;
  }
};

const User = mongoose.model("Users", userSchema);
export default User;
