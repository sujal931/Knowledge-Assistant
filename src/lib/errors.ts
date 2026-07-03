export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class AuthError extends AppError {
  constructor(message = "Authentication required") {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Access forbidden") {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(message, 404);
  }
}

export class ValidationError extends AppError {
  constructor(message = "Validation failed") {
    super(message, 400);
  }
}

export class RateLimitError extends AppError {
  constructor(message = "Too many requests") {
    super(message, 429);
  }
}

export class AIError extends AppError {
  constructor(message = "AI processing failed") {
    super(message, 502);
  }
}

export function handleApiError(error: unknown) {
  if (error instanceof AppError) {
    return {
      error: error.message,
      statusCode: error.statusCode,
    };
  }

  console.error("Unhandled error:", error);

  return {
    error: "Internal server error",
    statusCode: 500,
  };
}
