import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"



const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

// ----->configuring json with express || mean json is accepting
app.use(express.json({ limit: "16kb" }))

// acceping data through URL,you can ignore extended
app.use(express.urlencoded({ extended: true, limit: "16kb" }))

//---> static:> if you want to store file and folder, to accept public assets like pdf , images, favicon

app.use(express.static("public"))

//---->>> cookie parser does to acces cookies from server and from CRUD operation on them
app.use(cookieParser())



//routes
console.log("testing in app.js")
import userRouter from './routes/user.routes.js'


//routes declaration
app.use("/api/v1/users", userRouter)
export { app }



// import express from "express";
// import cors from "cors";
// import cookieParser from "cookie-parser";
// import userRouter from './routes/user.routes.js';

// const app = express();

// app.use(cors({
//     origin: process.env.CORS_ORIGIN,
//     credentials: true
// }));

// app.use(express.json({ limit: "16kb" }));
// app.use(express.urlencoded({ extended: true, limit: "16kb" }));
// app.use(express.static("public"));
// app.use(cookieParser());

// app.use("/api/v1/users", userRouter);

// export { app };
