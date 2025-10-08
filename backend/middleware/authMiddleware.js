const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ErrorResponse = require('../utils/errorResponse');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];
      console.log('Auth Middleware: Token received:', token);

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Auth Middleware: Decoded token:', decoded);

      // Get user from the token
      console.log('Auth Middleware: Looking up user with ID:', decoded.id);
      req.user = await User.findById(decoded.id).select('-password');
      console.log('Auth Middleware: User lookup result:', req.user);
      
      if (!req.user) {
        console.log('Auth Middleware: User not found in database, but continuing with null user');
        // Don't return error, just set req.user to null and let the route handle it
        req.user = null;
      }

      next();
    } catch (error) {
      console.error('Auth Middleware: Token verification failed:', error);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } else {
    console.log('Auth Middleware: No token found');
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

const authorize = (roles = []) => {
  // roles param can be a single role string (e.g. 'admin') or an array of roles (e.g. ['admin', 'publisher'])
  if (typeof roles === 'string') {
    roles = [roles];
  }

  return (req, res, next) => {
    console.log("Authorize middleware called.");
    console.log("Request user role:", req.user ? req.user.role : 'No user role found');
    console.log("Allowed roles for this route:", roles);

    if (!req.user || !req.user.role) {
      console.log("Authorization failed: No user or user role found.");
      return next(new ErrorResponse('Not authorized to access this route', 401));
    }

    if (!roles.includes(req.user.role)) {
      console.log(`Authorization failed: User role ${req.user.role} is not in allowed roles ${roles}`);
      return next(new ErrorResponse(`User role ${req.user.role} is not authorized to access this route`, 403));
    }
    console.log("Authorization successful.");
    next();
  };
};

module.exports = { protect, authorize };