class AIServiceError(Exception):
    """Raised when AI service is unavailable or returns an error."""
    def __init__(self, message, status_code=503):
        self.message = message
        self.status_code = status_code
        super().__init__(message)
