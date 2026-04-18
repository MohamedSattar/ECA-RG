import { RequestHandler } from "express";
import { clientErrorJson } from "../security/clientSafeError";
import { dataverseFetch } from "../dataverseClient";
import {
  applicationIsOwnedByEmail,
  budgetHeaderIsOwnedByEmail,
  budgetLineItemIsOwnedByEmail,
  isDataverseGuid,
} from "../budgetOwnership";

const BUDGETHEADERS = "prmtk_budgetheaders";
const BUDGETLINEITEMS = "prmtk_budgetlineitems";
const BUDGETSPENDS = "prmtk_budgetspends";
const APPLICATIONS = "prmtk_applications";

function requireBudgetUserEmail(
  req: Parameters<RequestHandler>[0],
): string | null {
  const email = req.user?.email?.trim();
  return email || null;
}

function singleRouteParam(
  v: string | string[] | undefined,
): string | undefined {
  if (v === undefined) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

/** GET /api/budget/headers?applicationId=xxx - list headers by application */
export const getBudgetHeadersByApplication: RequestHandler = async (
  req,
  res,
) => {
  try {
    const email = requireBudgetUserEmail(req);
    if (!email) {
      return res.status(403).json({
        error: "Forbidden",
        message: "User email required for budget access",
      });
    }

    const applicationId = req.query.applicationId as string;
    if (!applicationId) {
      return res.status(400).json({ error: "applicationId required" });
    }
    if (!isDataverseGuid(applicationId)) {
      return res.status(400).json({ error: "Invalid applicationId" });
    }
    if (!(await applicationIsOwnedByEmail(applicationId, email))) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const select =
      "prmtk_budgetheaderid,prmtk_budgetname,_prmtk_application_value,prmtk_totalbudget,prmtk_versionnumber,prmtk_status,prmtk_justification";
    const path = `/${BUDGETHEADERS}?$filter=_prmtk_application_value eq ${applicationId}&$select=${select}`;
    const response = await dataverseFetch("GET", path);
    const data = response.ok ? await response.json() : await response.text();
    res.status(response.status);
    if (response.headers.get("content-type")) {
      res.setHeader("Content-Type", response.headers.get("content-type")!);
    }
    if (typeof data === "object") res.json(data);
    else res.send(data);
  } catch (err) {
    res.status(502).json(clientErrorJson("Budget API error", err));
  }
};

/** GET /api/budget/headers/:id - single header */
export const getBudgetHeader: RequestHandler = async (req, res) => {
  try {
    const email = requireBudgetUserEmail(req);
    if (!email) {
      return res.status(403).json({
        error: "Forbidden",
        message: "User email required for budget access",
      });
    }

    const id = singleRouteParam(req.params.id);
    if (!id) return res.status(400).json({ error: "Header id required" });
    if (!isDataverseGuid(id)) {
      return res.status(400).json({ error: "Invalid header id" });
    }
    if (!(await budgetHeaderIsOwnedByEmail(id, email))) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const select =
      "prmtk_budgetheaderid,prmtk_budgetname,_prmtk_application_value,prmtk_totalbudget,prmtk_versionnumber,prmtk_status";
    const path = `/${BUDGETHEADERS}(${id})?$select=${select}`;
    const response = await dataverseFetch("GET", path);
    const data = response.ok ? await response.json() : await response.text();
    res.status(response.status);
    if (response.headers.get("content-type")) {
      res.setHeader("Content-Type", response.headers.get("content-type")!);
    }
    if (response.headers.get("odata-entityid")) {
      res.setHeader("OData-EntityId", response.headers.get("odata-entityid")!);
    }
    if (typeof data === "object") res.json(data);
    else res.send(data);
  } catch (err) {
    res.status(502).json(clientErrorJson("Budget API error", err));
  }
};

/** POST /api/budget/headers - create header */
export const createBudgetHeader: RequestHandler = async (req, res) => {
  try {
    const email = requireBudgetUserEmail(req);
    if (!email) {
      return res.status(403).json({
        error: "Forbidden",
        message: "User email required for budget access",
      });
    }

    const { applicationId, budgetName, totalBudget } = req.body;
    if (!applicationId) {
      return res.status(400).json({ error: "applicationId required" });
    }
    if (!isDataverseGuid(applicationId)) {
      return res.status(400).json({ error: "Invalid applicationId" });
    }
    if (!(await applicationIsOwnedByEmail(applicationId, email))) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const body = {
      prmtk_budgetname: budgetName ?? "Application Budget",
      prmtk_totalbudget: totalBudget ?? 0,
      "prmtk_Application@odata.bind": `/${APPLICATIONS}(${applicationId})`,
    };
    const path = `/${BUDGETHEADERS}`;
    const response = await dataverseFetch("POST", path, body);
    res.status(response.status);
    if (response.headers.get("content-type")) {
      res.setHeader("Content-Type", response.headers.get("content-type")!);
    }
    if (response.headers.get("odata-entityid")) {
      res.setHeader("OData-EntityId", response.headers.get("odata-entityid")!);
    }
    const data = response.ok
      ? await response.json().catch(() => ({}))
      : await response.text();
    if (typeof data === "object") res.json(data);
    else res.send(data);
  } catch (err) {
    res.status(502).json(clientErrorJson("Budget API error", err));
  }
};

/** GET /api/budget/line-items?budgetHeaderId=xxx */
export const getBudgetLineItems: RequestHandler = async (req, res) => {
  try {
    const email = requireBudgetUserEmail(req);
    if (!email) {
      return res.status(403).json({
        error: "Forbidden",
        message: "User email required for budget access",
      });
    }

    const budgetHeaderId = req.query.budgetHeaderId as string;
    if (!budgetHeaderId) {
      return res.status(400).json({ error: "budgetHeaderId required" });
    }
    if (!isDataverseGuid(budgetHeaderId)) {
      return res.status(400).json({ error: "Invalid budgetHeaderId" });
    }
    if (!(await budgetHeaderIsOwnedByEmail(budgetHeaderId, email))) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const select =
      "prmtk_budgetlineitemid,prmtk_lineitemname,prmtk_category,prmtk_description,prmtk_amount,_prmtk_budgetheader_value,prmtk_justification";
    const path = `/${BUDGETLINEITEMS}?$filter=_prmtk_budgetheader_value eq ${budgetHeaderId}&$select=${select}`;
    const response = await dataverseFetch("GET", path);
    const data = response.ok ? await response.json() : await response.text();
    res.status(response.status);
    if (response.headers.get("content-type")) {
      res.setHeader("Content-Type", response.headers.get("content-type")!);
    }
    if (typeof data === "object") res.json(data);
    else res.send(data);
  } catch (err) {
    res.status(502).json(clientErrorJson("Budget API error", err));
  }
};

/** POST /api/budget/line-items - create line item */
export const createBudgetLineItem: RequestHandler = async (req, res) => {
  try {
    const email = requireBudgetUserEmail(req);
    if (!email) {
      return res.status(403).json({
        error: "Forbidden",
        message: "User email required for budget access",
      });
    }

    const {
      budgetHeaderId,
      prmtk_lineitemname,
      prmtk_description,
      prmtk_amount,
      prmtk_category,
    } = req.body;
    if (!budgetHeaderId) {
      return res.status(400).json({ error: "budgetHeaderId required" });
    }
    if (!isDataverseGuid(budgetHeaderId)) {
      return res.status(400).json({ error: "Invalid budgetHeaderId" });
    }
    if (!(await budgetHeaderIsOwnedByEmail(budgetHeaderId, email))) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const body: Record<string, unknown> = {
      prmtk_lineitemname: prmtk_lineitemname ?? "",
      prmtk_description: prmtk_description ?? "",
      prmtk_amount: prmtk_amount ?? 0,
      prmtk_category: prmtk_category ?? "",
      "prmtk_BudgetHeader@odata.bind": `/${BUDGETHEADERS}(${budgetHeaderId})`,
    };
    const path = `/${BUDGETLINEITEMS}`;
    const response = await dataverseFetch("POST", path, body);
    res.status(response.status);
    if (response.headers.get("content-type")) {
      res.setHeader("Content-Type", response.headers.get("content-type")!);
    }
    if (response.headers.get("odata-entityid")) {
      res.setHeader("OData-EntityId", response.headers.get("odata-entityid")!);
    }
    const data = response.ok
      ? await response.json().catch(() => ({}))
      : await response.text();
    if (typeof data === "object") res.json(data);
    else res.send(data);
  } catch (err) {
    res.status(502).json(clientErrorJson("Budget API error", err));
  }
};

/** PATCH /api/budget/line-items/:id */
export const updateBudgetLineItem: RequestHandler = async (req, res) => {
  try {
    const email = requireBudgetUserEmail(req);
    if (!email) {
      return res.status(403).json({
        error: "Forbidden",
        message: "User email required for budget access",
      });
    }

    const id = singleRouteParam(req.params.id);
    if (!id) return res.status(400).json({ error: "Line item id required" });
    if (!isDataverseGuid(id)) {
      return res.status(400).json({ error: "Invalid line item id" });
    }
    if (!(await budgetLineItemIsOwnedByEmail(id, email))) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const {
      prmtk_lineitemname,
      prmtk_description,
      prmtk_amount,
      prmtk_category,
    } = req.body;
    const body: Record<string, unknown> = {};
    if (prmtk_lineitemname !== undefined)
      body.prmtk_lineitemname = prmtk_lineitemname;
    if (prmtk_description !== undefined)
      body.prmtk_description = prmtk_description;
    if (prmtk_amount !== undefined) body.prmtk_amount = prmtk_amount;
    if (prmtk_category !== undefined) body.prmtk_category = prmtk_category;
    const path = `/${BUDGETLINEITEMS}(${id})`;
    const response = await dataverseFetch("PATCH", path, body);
    res.status(response.status);
    if (response.headers.get("content-type")) {
      res.setHeader("Content-Type", response.headers.get("content-type")!);
    }
    const data = response.ok
      ? await response.json().catch(() => ({}))
      : await response.text();
    if (typeof data === "object") res.json(data);
    else res.send(data);
  } catch (err) {
    res.status(502).json(clientErrorJson("Budget API error", err));
  }
};

/** DELETE /api/budget/line-items/:id */
export const deleteBudgetLineItem: RequestHandler = async (req, res) => {
  try {
    const email = requireBudgetUserEmail(req);
    if (!email) {
      return res.status(403).json({
        error: "Forbidden",
        message: "User email required for budget access",
      });
    }

    const id = singleRouteParam(req.params.id);
    if (!id) return res.status(400).json({ error: "Line item id required" });
    if (!isDataverseGuid(id)) {
      return res.status(400).json({ error: "Invalid line item id" });
    }
    if (!(await budgetLineItemIsOwnedByEmail(id, email))) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const path = `/${BUDGETLINEITEMS}(${id})`;
    const response = await dataverseFetch("DELETE", path);
    res.status(response.status);
    const text = await response.text();
    if (text) res.send(text);
    else res.end();
  } catch (err) {
    res.status(502).json(clientErrorJson("Budget API error", err));
  }
};

/** GET /api/budget/spends?budgetLineItemId=xxx */
export const getBudgetSpendsByLineItem: RequestHandler = async (req, res) => {
  try {
    const email = requireBudgetUserEmail(req);
    if (!email) {
      return res.status(403).json({
        error: "Forbidden",
        message: "User email required for budget access",
      });
    }

    const budgetLineItemId = req.query.budgetLineItemId as string;
    if (!budgetLineItemId) {
      return res.status(400).json({ error: "budgetLineItemId required" });
    }
    if (!isDataverseGuid(budgetLineItemId)) {
      return res.status(400).json({ error: "Invalid budgetLineItemId" });
    }
    if (!(await budgetLineItemIsOwnedByEmail(budgetLineItemId, email))) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const path = `/${BUDGETSPENDS}?$filter=_prmtk_lineitem_value eq ${budgetLineItemId}`;
    const response = await dataverseFetch("GET", path);
    const data = response.ok ? await response.json() : await response.text();

    res.status(response.status);
    const contentType = response.headers.get("content-type");
    if (contentType) {
      res.setHeader("Content-Type", contentType);
    }
    if (typeof data === "object") res.json(data);
    else if (contentType?.includes("application/octet-stream")) {
      res.end(Buffer.from(data));
    } else res.send(data);
  } catch (err) {
    res.status(502).json(clientErrorJson("Budget API error", err));
  }
};

/**
 * POST /api/budget/spends/bulk
 * Upsert spend rows for a given budget line item.
 * Body: { budgetLineItemId: string, spends: { id?: string; month: string; year: string; amount: number }[] }
 */
export const upsertBudgetSpends: RequestHandler = async (req, res) => {
  try {
    const email = requireBudgetUserEmail(req);
    if (!email) {
      return res.status(403).json({
        error: "Forbidden",
        message: "User email required for budget access",
      });
    }

    const { budgetLineItemId, spends } = req.body as {
      budgetLineItemId?: string;
      spends?: { id?: string; month: string; year: string; amount: number }[];
    };

    if (!budgetLineItemId) {
      return res.status(400).json({ error: "budgetLineItemId required" });
    }
    if (!isDataverseGuid(budgetLineItemId)) {
      return res.status(400).json({ error: "Invalid budgetLineItemId" });
    }
    if (!(await budgetLineItemIsOwnedByEmail(budgetLineItemId, email))) {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (!Array.isArray(spends)) {
      return res.status(400).json({ error: "spends array required" });
    }

    for (const s of spends) {
      if (s?.id && !isDataverseGuid(s.id)) {
        return res.status(400).json({ error: "Invalid spend id" });
      }
    }

    const listPath = `/${BUDGETSPENDS}?$filter=_prmtk_lineitem_value eq ${budgetLineItemId}`;
    const existingResponse = await dataverseFetch("GET", listPath);
    const existingJson = existingResponse.ok
      ? await existingResponse.json()
      : { value: [] };
    const existing: any[] = Array.isArray(existingJson.value)
      ? existingJson.value
      : [];

    const incomingById = new Map<
      string,
      { id?: string; month: string; year: string; amount: number }
    >();
    spends.forEach((s) => {
      if (s && s.id) {
        incomingById.set(s.id, s);
      }
    });

    for (const ex of existing) {
      const id = ex["prmtk_budgetspendid"] as string | undefined;
      if (id && !incomingById.has(id)) {
        const deletePath = `/${BUDGETSPENDS}(${id})`;
        await dataverseFetch("DELETE", deletePath);
      }
    }

    for (const s of spends) {
      const amount = Number(s.amount) || 0;
      const body: Record<string, unknown> = {
        prmtk_spent: amount,
        prmtk_reportingmonth: s.month,
        prmtk_reportingyear: s.year,
      };

      if (s.id) {
        const patchPath = `/${BUDGETSPENDS}(${s.id})`;
        await dataverseFetch("PATCH", patchPath, body);
      } else {
        const createBody = {
          ...body,
          "prmtk_LineItem@odata.bind": `/${BUDGETLINEITEMS}(${budgetLineItemId})`,
        };
        await dataverseFetch("POST", `/${BUDGETSPENDS}`, createBody);
      }
    }

    const finalResponse = await dataverseFetch("GET", listPath);
    const finalJson = finalResponse.ok
      ? await finalResponse.json()
      : { value: [] };
    const rows: any[] = Array.isArray(finalJson.value) ? finalJson.value : [];

    const totalSpend = rows.reduce(
      (sum, r) => sum + (Number(r["prmtk_amount"]) || 0),
      0,
    );

    res.status(200).json({ value: rows, totalSpend });
  } catch (err) {
    res.status(502).json(clientErrorJson("Budget API error", err));
  }
};
