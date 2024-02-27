// // import express from "express";
// import dotenv from "dotenv";
// import connectDB from "./db/index.js";
// import { app } from './app.js'
// dotenv.config({
//     path: './env'
// });

// // const app = express();
// app()
// // Set up an error handler for the app
// // app.on('error', (err) => {
// //     console.log("Express server error:", err);
// // });


// // dotenv.config({ path: './public/temp/.env' });

// // whenever an asynchronous method completes, return a promise
// connectDB()
//     .then(() => {
//         app.listen(process.env.PORT || 8000, () => {
//             console.log(`Server is running at port : ${process.env.PORT}`);
//         });
//     })
//     .catch((err) => {
//         console.log("MongoDB connection failed !!!", err);
//     });

import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from './app.js';

dotenv.config({ path: './.env' });

(async () => {
    try {
        await connectDB();
        const PORT = process.env.PORT || 8000;
        app.listen(PORT, () => {
            console.log(`Server is running at port : ${PORT}`);
        });
    } catch (err) {
        console.log("Error starting server:", err);
    }
})();
















/*
import express from "express"
const app = express()

    // iffi should always start from semi-colon for error-free approach,because previous line could be terminated without semi-colo
    ; (async () => {
        try {
            await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
            app.on("error", (error) => {
                console.log("ERRPR", error);
                throw error
            })

            app.listen(process.env.PORT, () => {
                console.log(`App is litening in port ${process.env.PORT}`);
            })

        } catch (error) {
            console.log("Error", error);
            throw err
        }
    })()
    */