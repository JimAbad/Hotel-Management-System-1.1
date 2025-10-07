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
      req.user = await User.findById(decoded.id).select('-password');
      console.log('Auth Middleware: User attached to request:', req.user);

      next();
    } catch (error) {
      console.error('Auth Middleware: Token verification failed:', error);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    console.log('Auth Middleware: No token found');
    res.status(401).json({ message: 'Not authorized, no token' });
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