import sqlite3
from contextlib import contextmanager
from pathlib import Path

from app.config import settings

_SCHEMA = """
CREATE TABLE IF NOT EXISTS portal_material (
    material_code TEXT PRIMARY KEY,
    material_name TEXT,
    base_unit TEXT,
    plant TEXT,
    storage_location TEXT,
    first_seen_sales_order TEXT,
    first_seen_sales_order_item TEXT,
    last_seen_sales_order TEXT,
    last_seen_sales_order_item TEXT,
    reference_count INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_portal_material_name
    ON portal_material(material_name);
CREATE INDEX IF NOT EXISTS idx_portal_material_plant
    ON portal_material(plant);
"""


def _ensure_parent(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)


def init_db(db_path: str | None = None) -> None:
    path = Path(db_path or settings.db_path)
    _ensure_parent(path)
    with sqlite3.connect(path) as conn:
        conn.executescript(_SCHEMA)
        conn.commit()


@contextmanager
def get_connection(db_path: str | None = None):
    path = Path(db_path or settings.db_path)
    _ensure_parent(path)
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()
