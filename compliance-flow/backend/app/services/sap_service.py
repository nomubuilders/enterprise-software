"""
SAP ERP Service for ComplianceFlow.

Extracts financial data from SAP S/4HANA via OData v4 APIs
and generates financial reports (balance sheet, P&L, cost center, GL).
"""

import logging
from typing import Any, Dict, Optional

import aiohttp

logger = logging.getLogger(__name__)


class SAPERPService:
    """Handles SAP S/4HANA OData v4 API interactions."""

    def __init__(self, sap_url: str, auth_header: str, client_number: str = "100"):
        """
        Initialize SAP service.

        Args:
            sap_url: SAP system base URL
            auth_header: Authorization header (Bearer or Basic)
            client_number: SAP client number
        """
        self.sap_url = sap_url.rstrip("/")
        self.client_number = client_number
        self.headers = {
            "Authorization": auth_header,
            "Content-Type": "application/json",
            "Accept": "application/json",
            "sap-client": client_number,
        }

    async def _odata_request(self, path: str, params: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
        """Execute an OData v4 GET request against the SAP system."""
        url = f"{self.sap_url}{path}"
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=self.headers, params=params) as resp:
                if resp.status != 200:
                    error = await resp.text()
                    raise ValueError(f"SAP OData error ({resp.status}): {error}")
                return await resp.json()

    async def generate_report(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate a financial report based on configuration.

        Args:
            config: Report configuration with reportType, fiscalYear, companyCode, etc.

        Returns:
            Dict with report data and metadata
        """
        report_type = config.get("reportType", "balance_sheet")
        fiscal_year = config.get("fiscalYear", "2025")
        company_code = config.get("companyCode", "1000")

        handlers = {
            "balance_sheet": self._balance_sheet,
            "profit_loss": self._profit_loss,
            "cost_center": self._cost_center,
            "general_ledger": self._general_ledger,
            "custom_odata": self._custom_query,
        }

        handler = handlers.get(report_type)
        if not handler:
            raise ValueError(f"Unsupported report type: {report_type}")

        return await handler(config, fiscal_year, company_code)

    async def _balance_sheet(self, config: Dict[str, Any], fiscal_year: str, company_code: str) -> Dict[str, Any]:
        """Generate balance sheet report via OData."""
        params = {
            "$filter": f"CompanyCode eq '{company_code}' and FiscalYear eq '{fiscal_year}'",
            "$select": "GLAccount,GLAccountName,AmountInCompanyCodeCurrency,CompanyCodeCurrency",
        }
        try:
            data = await self._odata_request(
                "/sap/opu/odata4/sap/api_balancesheet/srvd_a2x/SAP/BalanceSheet/0001/BalanceSheet",
                params,
            )
        except Exception as e:
            logger.warning(f"SAP API call failed: {e}. Returning placeholder report.")
            data = {"value": []}

        return {
            "report_type": "balance_sheet",
            "fiscal_year": fiscal_year,
            "company_code": company_code,
            "financial_data": data.get("value", []),
            "record_count": len(data.get("value", [])),
            "include_actuals": config.get("includeActuals", True),
            "include_budget": config.get("includeBudget", False),
        }

    async def _profit_loss(self, config: Dict[str, Any], fiscal_year: str, company_code: str) -> Dict[str, Any]:
        """Generate profit & loss report via OData."""
        params = {
            "$filter": f"CompanyCode eq '{company_code}' and FiscalYear eq '{fiscal_year}'",
        }
        try:
            data = await self._odata_request(
                "/sap/opu/odata4/sap/api_profitandloss/srvd_a2x/SAP/ProfitAndLoss/0001/ProfitAndLoss",
                params,
            )
        except Exception as e:
            logger.warning(f"SAP API call failed: {e}. Returning placeholder report.")
            data = {"value": []}

        return {
            "report_type": "profit_loss",
            "fiscal_year": fiscal_year,
            "company_code": company_code,
            "financial_data": data.get("value", []),
            "record_count": len(data.get("value", [])),
        }

    async def _cost_center(self, config: Dict[str, Any], fiscal_year: str, company_code: str) -> Dict[str, Any]:
        """Generate cost center analysis report."""
        cost_centers = config.get("costCenters", "")
        filter_parts = [f"CompanyCode eq '{company_code}'", f"FiscalYear eq '{fiscal_year}'"]
        if cost_centers:
            cc_list = [c.strip() for c in cost_centers.split(",") if c.strip()]
            if cc_list:
                cc_filter = " or ".join(f"CostCenter eq '{cc}'" for cc in cc_list)
                filter_parts.append(f"({cc_filter})")

        params = {"$filter": " and ".join(filter_parts)}
        try:
            data = await self._odata_request(
                "/sap/opu/odata4/sap/api_costcenter/srvd_a2x/SAP/CostCenter/0001/CostCenterData",
                params,
            )
        except Exception as e:
            logger.warning(f"SAP API call failed: {e}. Returning placeholder report.")
            data = {"value": []}

        return {
            "report_type": "cost_center",
            "fiscal_year": fiscal_year,
            "company_code": company_code,
            "cost_centers": cost_centers,
            "financial_data": data.get("value", []),
            "record_count": len(data.get("value", [])),
        }

    async def _general_ledger(self, config: Dict[str, Any], fiscal_year: str, company_code: str) -> Dict[str, Any]:
        """Generate general ledger report."""
        params = {
            "$filter": f"CompanyCode eq '{company_code}' and FiscalYear eq '{fiscal_year}'",
        }
        try:
            data = await self._odata_request(
                "/sap/opu/odata4/sap/api_glaccountlineitem/srvd_a2x/SAP/GLAccountLineItem/0001/GLAccountLineItem",
                params,
            )
        except Exception as e:
            logger.warning(f"SAP API call failed: {e}. Returning placeholder report.")
            data = {"value": []}

        return {
            "report_type": "general_ledger",
            "fiscal_year": fiscal_year,
            "company_code": company_code,
            "financial_data": data.get("value", []),
            "record_count": len(data.get("value", [])),
        }

    async def _custom_query(self, config: Dict[str, Any], fiscal_year: str, company_code: str) -> Dict[str, Any]:
        """Execute a custom OData query."""
        custom_query = config.get("customQuery", "")
        if not custom_query:
            return {
                "report_type": "custom_odata",
                "error": "No custom query provided",
                "financial_data": [],
            }

        params = {"$filter": custom_query}
        try:
            data = await self._odata_request("/sap/opu/odata4/sap/api_custom/srvd_a2x/SAP/Custom/0001/Data", params)
        except Exception as e:
            logger.warning(f"SAP custom query failed: {e}")
            data = {"value": []}

        return {
            "report_type": "custom_odata",
            "fiscal_year": fiscal_year,
            "company_code": company_code,
            "custom_query": custom_query,
            "financial_data": data.get("value", []),
            "record_count": len(data.get("value", [])),
        }
