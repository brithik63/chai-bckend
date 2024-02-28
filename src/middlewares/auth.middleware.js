// this middleware
// verify there is user or not

import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

const verifyJWT = asyncHandler(async (req, _, next) => {  // if res has no usage, replace with _
    try {
        //access token
        // req has cookie access because in app.js we gave it access to middle ware app.use(cookieParser)
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
        // chaces cookie may coming from header, so req.header() in authorization header aS Authorization: Bearer <token>

        if (!token) {
            throw new ApiError(401, "Unauthorized request")
        }

        // validate token
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)

        const user = await User.findById(decodedToken?._id).select("-password -refreshToken ")
        if (!user) {
            throw new ApiError(401, "Invalid Access Token")
        }
        //add object to req
        req.user = user;
        next();
    } catch (error) {
        throw new ApiError(401, error?.message || "invalid access token")
    }
})

export default verifyJWT