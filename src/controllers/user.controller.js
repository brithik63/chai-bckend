import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"
import mongoose from "mongoose"


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

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const user = User.findById(req?.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(400, "invalid old password")
    }

    user.password = newPassword
    await user.save({ validateBeforeSave: false })

    return res.status(200)
        .json(new ApiResponse(200, {}, "password changed successfully"))
})

// req.user = user in authMiddlewarae
const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(200, req.user, "current user fetched successfully")
})

const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body;
    if (!fullName || !email) {
        throw new ApiError(400, "All fields are required")
    }

    const user = User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email: email
            }
        },
        {
            new: true
        }
    ).select("-password")

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Account details updated successfully"))

})

const updateUserAvatar = asyncHandler(async (req, res) => {

    const avatarLocalPath = req.file?.path
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avtar file is missing")
    }

    //TODO:delete old image
    //make utility func to delete

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    if (!avatar.url) {
        throw new ApiError(400, "Error while uploading on avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {
            new: true
        }
    ).select("-password")
    return res.status(200)
        .json(
            ApiResponse(200, user, "avatar image updated successfully")
        )
})

const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path
    if (!coverImageLocalPath) {
        throw new ApiError(400, "Avtar file is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    if (!coverImage.url) {
        throw new ApiError(400, "Error while uploading on cover image")
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {
            new: true
        }
    ).select("-password")
    return res.status(200)
        .json(
            ApiResponse(200, user, "cover image updated successfully")
        )

})

const getUserCannelProfile = asyncHandler(async (req, res) => {
    const { username } = req.params;

    if (!username?.trim()) {
        throw new ApiError(400, "Username is missing")
    }
    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscriber"
            }
        }, {
            from: "subscriptions",
            localField: "_id",
            foreignField: "subscriber",
            as: "subscribedTo"
        },
        {
            $addFields: {
                subscriberCount: {
                    $size: "$subscribers"
                },
                channelSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: { // check ki subscriber mei , mei hu k nahi
                    $cond: {
                        if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                subscriberCount: 1,
                channelSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1
            }
        }
    ])
    if (!channel?.length) {
        throw new ApiError(404, "channel does not exists")
    }
    return res
        .status(200)
        .json(
            new ApiResponse(200, channel[0], "User channel fetched successfully")
        )
})

const getWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                /*subpipeline*/
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: {
                                $project: {
                                    fullName: 1,
                                    username: 1,
                                    avatar: 1,

                                }
                            }
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner",
                            }
                        }
                    }
                ]
            }
        }
    ])
    return res
        .status(200)
        .json(new ApiResponse(200,
            user[0].watchHistory,
            "watch history fetched successfully"))

})

export {
    registerUser, loginUser, logoutUser, refreshAccessToken, changeCurrentPassword, getCurrentUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage, getUserCannelProfile, getWatchHistory,
}