from pydantic import BaseModel
from typing import List, Optional


class SettingsImportItem(BaseModel):
    key: str
    value: str


class SettingsImportRequest(BaseModel):
    settings: List[SettingsImportItem]


class SettingsExportItem(BaseModel):
    key: str
    label: str
    value: Optional[str]
    type: str
    group: str
    is_public: bool


class SettingsExportResponse(BaseModel):
    settings: List[SettingsExportItem]