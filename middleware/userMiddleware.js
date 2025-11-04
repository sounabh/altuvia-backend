import jwt from 'jsonwebtoken';

export const extractUserIdFromToken = (req, res, next) => {
  try {
    const token =
      req.cookies?.auth_token ||
      (req.headers.authorization && req.headers.authorization.split(' ')[1]);

    if (!token || typeof token !== 'string') {
      return res.status(401).json({
        success: false,
        error: 'Access token is required',
      });
    }
//console.log(token);

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'altuvia782729');
    } catch (jwtError) {
      console.error("❌ JWT verification failed:", jwtError.message);
      return res.status(401).json({
        success: false,
        error: jwtError.message || 'Invalid or expired token',
      });
    }

    if (!decoded || !decoded.id) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token payload',
      });
    }

    req.userId = decoded.id;
    next();
  } catch (err) {
    // Fallback safety net (should rarely hit this)
    console.error("🔥 Unexpected token processing error:", err.message);
    return res.status(401).json({
      success: false,
      error: 'Authentication failed',
    });
  }
};
