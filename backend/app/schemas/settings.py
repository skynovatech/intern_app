from pydantic import BaseModel
from typing import List, Optional, Dict


class SettingResponse(BaseModel):
    key: str
    label: str
    value: Optional[str]
    type: str
    group: str
    is_public: bool

    class Config:
        from_attributes = True


class SettingUpdate(BaseModel):
    key: str
    value: str


class SettingsUpdateRequest(BaseModel):
    settings: Dict[str, str]


class PublicSettingsResponse(BaseModel):
    settings: Dict[str, str]
