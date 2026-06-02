#!/usr/bin/env python3
"""Live test for Material Stock API (SAP_COM_0164)."""
from app.db.database import init_db
from app.services.material_stock import material_stock_service


def main():
    init_db()
    lines, total = material_stock_service.list_stock(material="FG10", page_size=5)
    assert total >= 1, f"expected FG10 stock lines, got total={total}"
    assert lines[0].material == "FG10"
    assert lines[0].quantity > 0

    summaries = material_stock_service.summarize_material_stock("FG10", plant="1010")
    assert summaries
    assert summaries[0].availableQty >= 0

    print("material stock live tests passed")
    print(f"FG10 lines={total}, sample qty={lines[0].quantity} {lines[0].materialBaseUnit}")


if __name__ == "__main__":
    main()
