export function successResponse(data, message = 'Success') {
  return { success: true, message, data };
}

export function errorResponse(message, code = null) {
  return { success: false, message, code };
}
