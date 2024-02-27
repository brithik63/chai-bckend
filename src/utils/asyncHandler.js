const asyncHandler = (requestHandler) => {
    return (req, res, next) => {
        Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err))
    }
}

export { asyncHandler }



//======>>>>>we are making a wrapper function also asynchHanldeler fuction is a higher order function


// const asyncHandler = () => { }
// const asyncHandler=(func)=>{async()=>{}}
// const asyncHandler = (func) => async () => { }

// const async = (fn) =>async(req,res,next)=>{}
// try {
//     await fn(req,res,next)
// } catch (error) {
//     res.status(er.code || 500).json({
//         success:false,
//         message:err.message
//     })
// }