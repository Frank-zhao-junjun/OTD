#!/usr/bin/env python3
"""Export all SAP customer master data with expanded relations."""
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))

from app.config import settings
from app.services.customers import customer_service


def main() -> None:
    items, total = customer_service.get_all_customers_full(
        company_code=settings.default_company_code,
        sales_organization=settings.default_sales_organization,
        distribution_channel=settings.default_distribution_channel,
        division=settings.default_division,
        include_all_relations=True,
    )
    payload = {
        "source": "API_BUSINESS_PARTNER/A_Customer",
        "expand": "to_CustomerSalesArea,to_CustomerCompany,to_CustomerText",
        "total": total,
        "customers": [item.model_dump() for item in items],
    }

    out_dir = os.path.join(os.path.dirname(__file__), "接口")
    out_file = os.path.join(out_dir, "Customer Master Full Data.json")
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)

    print(f"Exported {total} customers -> {out_file}")
    for item in items:
        print(
            f"  - {item.customerCode} {item.customerName} | "
            f"salesAreas={len(item.sapSalesAreas)} companies={len(item.sapCompanies)} "
            f"addresses={len(item.sapAddresses)}"
        )


if __name__ == "__main__":
    main()
