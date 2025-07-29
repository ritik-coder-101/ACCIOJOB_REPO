// middleware/authMiddleware.js
const jwt=require('jsonwebtoken');

const auth =(req,res,next) => {

    const token=req.header('x-auth-token');

    if (!token) {
        return res.status(401).json({msg : 'No token, authorization denied'});
    }

    try {
        const decode=jwt.decode(token,process.env.JWT_SECRET);
        req.user=decode.id;
        next();
    } catch (err) {
        res.status(401).json({msg : 'Token is Not Valid'});
    }
};

module.exports=auth;