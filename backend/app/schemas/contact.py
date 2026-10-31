from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.schemas.text import StoredText

# Short enough that the daily limit (endpoints/contact.py) bounds the table's growth.
MAX_MESSAGE_CHARS = 2000


class ContactRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: StoredText = Field(min_length=1, max_length=100)
    email: EmailStr
    message: StoredText = Field(min_length=1, max_length=MAX_MESSAGE_CHARS)
    # A field the form hides from people: only bots fill it in.
    website: str = Field(default="", max_length=200)
