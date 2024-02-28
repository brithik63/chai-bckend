import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"


// we will take async not asyncHandler because this is internal method not for web request
const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)
        console.log("user tested", user);
        const accessToken = user.generateAccessToken()
        console.log("accessToken", accessToken);
        const refreshToken = user.generateRefreshToken()
        //save in DB which is object
        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })  //validateBeforeSave: false  , it doesnt activate all the fields in database to update or save
        console.log("testing");

        return { accessToken, refreshToken }
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access tokens")
    }
}


const registerUser = asyncHandler(async (req, res) => {
    // get user detail from frontend
    // validation -- not empty 
    // check if user already exists : username,email
    // check for images , check for avatar
    // upload them to cloudinary,avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation 
    // return res


    // const { fullName, email, username, password } = req.body

    const { fullName, email, username, password } = req.body
    console.log(fullName, email, username, password, "VAlues");

    if (
        [fullName, email, username, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    const existedUser = await User.findOne({ // findOne returns the first match and return boolean
        $or: [{ username }, { email }]  // find In User by username also email, return even one of two matches
    })

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exist")
    }


    const avatarLocalPath = req.files?.avatar[0]?.path;  // req.files:> method of multer
    // console.log(req.files);
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;  --> this can give error if field is emptu
    let coverImageLocalPath;
    if (req.fies && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }


    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    };

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!avatar) {
        throw new ApiError(400, "Avatar file is required")
    }
    const user = await User.create({
        fullName,
        avatar: avatar.url,  // validation already required
        coverImage: coverImage?.url || "", // if we don't get coverImage , code will break
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(  //select() selects all the field and you can remove the field by -fieldName
        "-password -refreshToken"
    )
    if (!createdUser) {
        throw new ApiError(500, "something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully")
    )

})

//login user
const loginUser = asyncHandler(async (req, res) => {
    //req body -->data
    // username || email 
    // find the user
    //password check
    //access and refresh token
    // send cookie
    //res
    const { email, username, password } = req.body;
    console.log('crediantials', email, username, password);
    if (!(email || username)) {
        throw new ApiError(400, "username or email is required")
    }

    const user = await User.findOne({
        $or: [{ username }, { email }]   // find value based on username || email

    })
    if (!user) {
        throw new ApiError(404, "User doesn't exists")
    }

    //user, !User, because user is instance of user
    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(401, "Pasword is not Valid");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

    // field to be shown in user
    const loggedInUser = await User.findById(user._id).
        select("-password -refreshToken")

    //send cookies , we have to make option object to make cookie secure

    const options = {
        httpOnly: true, //
        secure: true // now these cookies only modified by server not by usesr
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(200,
                {
                    user: loggedInUser, accessToken, refreshToken
                },

                "user logged in successfully"
            )
        )


})
//logout
const logoutUser = asyncHandler(async (req, res) => {
    // get the user
    // get refreshToken
    // delete refreshToken
    // findByIdAndUpdate-->find the user, 
    // $set: update the field
    // new: true  :>>> gives the new updated field

    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: { refreshToken: undefined }
        },
        {
            new: true
        }
    )
    const options = {
        httpOnly: true,
        secure: true
    }
    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiError(200, {}, "User logged out successfully"))
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
    if (!incomingRefreshToken) {
        new ApiError(401, "unauthorizzed request")
    }
    //verify token
    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )

        const user = await User.findById(decodedToken._id)
        if (!user) {
            new ApiError(401, "invalid refresh token`")
        }

        //match tokens
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used")
        }
        //if matches---> generate new tokens

        const options = {
            httpOnly: true,
            secure: true
        }

        const { accessToken, newRefreshToken } = await generateAccessAndRefreshTokens(user._id);



        return res.status(200
            .cookie("accessToken", accessToken, options)
            .cookie("newRefreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, refreshToken: newRefreshToken },
                    "Access token refresh successfully"

                )
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.messae || "invalid refersh token")
    }
})

export {
    registerUser, loginUser, logoutUser, refreshAccessToken
}