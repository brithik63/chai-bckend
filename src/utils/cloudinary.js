import { v2 as cloudinary } from 'cloudinary';
import { response } from 'express';
import fs from "fs"     //npm library __>>allow to perform CRUD  operation files

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDDINARY_API_SECRET
});


const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null
        //upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })

        //file has been uploaded successfully
        fs.unlinkSync(localFilePath) // remove file from local path
        return response
    } catch (error) {
        // using the above function , the file or part of file has been uploaded or part of file
        //we will unlink or remove the file from server

        fs.unlink // remove the locally saved temporary file as th eupload operation got failerd
        return null;
    }

}


cloudinary.uploader.upload("https://upload.wikimedia.org/wikipedia/commons/a/ae/Olympic_flag.jpg",
    { public_id: "olympic_flag" },
    function (error, result) { console.log(result); });

export { uploadOnCloudinary };