from app.glossa.result import ErrorInfo, ErrorKind


class GlossaError(Exception):
    """A mistake in the student's program.

    `message` is shown to students as is, so write it in Greek, in the style of
    the Διερμηνευτής ("Η μεταβλητή Χ δεν έχει πάρει τιμή.").
    """

    def __init__(self, message: str, line: int | None = None, kind: ErrorKind = "runtime"):
        super().__init__(message)
        self.message = message
        self.line = line
        self.kind = kind

    def info(self) -> ErrorInfo:
        return ErrorInfo(kind=self.kind, message=self.message, line=self.line)
