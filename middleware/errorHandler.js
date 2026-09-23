const errorHandler = (err, req, res, next) => {
  console.error('🔥 Error:', err.message);

  // Duplicate key from MongoDB
  if (err.code === 11000) {
    return res.status(400).json({ message: 'Duplicate value entered' });
  }

  // BSON errors from ObjectId
  if (err.name === 'BSONError' || err.name === 'BSONTypeError') {
    return res.status(400).json({ message: 'Invalid ID format' });
  }

  const status = err.status || 500;
  res.status(status).json({ message: err.message || 'Internal Server Error' });
};

export default errorHandler;