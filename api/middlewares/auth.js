const jwt = require('jsonwebtoken');

// Helper middleware to verify token (Authentication)
const verifyToken = (req, res, next) => {
  let token = req.headers['authorization'];
  
  if (token) {
    token = token.split(' ')[1];
  } else if (req.query.token) {
    token = req.query.token;
  }

  if (!token) return res.status(403).json({ error: 'No token provided' });

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Unauthorized' });
    req.userId = decoded.id;
    req.userRole = decoded.role;
    next();
  });
};

// Helper middleware to verify role (Authorization)
const verifyRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.userRole)) {
      return res.status(403).json({ error: 'Forbidden. Role not allowed.' });
    }
    next();
  };
};

module.exports = {
  verifyToken,
  verifyRole
};
