export const sendSuccess = (res, statusCode, data, message = 'Success', metadata = null) => {
  const response = {
    status: 'success',
    message,
    data,
  };
  
  if (metadata) {
    response.metadata = metadata;
  }
  
  res.status(statusCode).json(response);
};
