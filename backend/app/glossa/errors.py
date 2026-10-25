from typing import TYPE_CHECKING

from app.glossa.result import ErrorInfo, ErrorKind

if TYPE_CHECKING:
    from app.glossa.lexer import Token


class GlossaError(Exception):
    """A mistake in the student's program.

    `message` is shown to students as is, so write it in Greek, in the style of
    the Διερμηνευτής ("Η μεταβλητή Χ δεν έχει πάρει τιμή.").
    """

    def __init__(
        self,
        message: str,
        line: int | None = None,
        kind: ErrorKind = "runtime",
        column: int | None = None,
        end_column: int | None = None,
    ):
        super().__init__(message)
        self.message = message
        self.line = line
        self.kind = kind
        self.column = column
        self.end_column = end_column

    @classmethod
    def at(cls, token: "Token", message: str) -> "GlossaError":
        """A syntax error pointing at `token`."""
        return cls(message, token.line, "syntax", token.column, token.end_column)

    def info(self) -> ErrorInfo:
        return ErrorInfo(
            kind=self.kind,
            message=self.message,
            line=self.line,
            column=self.column,
            end_column=self.end_column,
        )
