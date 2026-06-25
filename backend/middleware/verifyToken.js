const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {

    // Read the Authorization header
    const authHeader = req.headers.authorization;

    // Check if the header exists
    if (!authHeader) {
        return res.status(401).json({
            message: "Access denied. No token provided."
        });
    }

    // Extract the token
    const token = authHeader.split(" ")[1];

    try {

        // Verify the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Store the decoded payload in req.user
        req.user = decoded;

        // Continue to the requested route
        next();

    } catch (err) {

        return res.status(401).json({
            message: "Invalid or expired token."
        });

    }
};

module.exports = verifyToken;