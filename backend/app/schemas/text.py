from typing import Annotated

from pydantic import AfterValidator


def _no_nul(value: str) -> str:
    # Postgres text can't hold NUL: the insert would fail with an unhandled DataError
    # (a 500 without CORS headers), so it's a 422 here instead.
    if "\x00" in value:
        raise ValueError("Text must not contain NUL characters")
    return value


# Text that is stored in the database.
StoredText = Annotated[str, AfterValidator(_no_nul)]
