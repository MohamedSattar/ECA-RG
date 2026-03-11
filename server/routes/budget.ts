import { RequestHandler } from "express";
import { dataverseFetch } from "../dataverseClient";

const BUDGETHEADERS = "prmtk_budgetheaders";
const BUDGETLINEITEMS = "prmtk_budgetlineitems";
const BUDGETSPENDS = "prmtk_budgetspends";
const APPLICATIONS = "prmtk_applications";

/** GET /api/budget/headers?applicationId=xxx - list headers by application */
export const getBudgetHeadersByApplication: RequestHandler = async (req, res) => {
  try {
    const applicationId = req.query.applicationId as string;
    if (!applicationId) {
      return res.status(400).json({ error: "applicationId required" });
    }
    const select = "prmtk_budgetheaderid,prmtk_budgetname,_prmtk_application_value,prmtk_totalbudget,prmtk_versionnumber,prmtk_status";
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
    console.error("[Budget] getBudgetHeadersByApplication error:", err);
    res.status(502).json({ error: "Budget API error", details: String(err) });
  }
};

/** GET /api/budget/headers/:id - single header */
export const getBudgetHeader: RequestHandler = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ error: "Header id required" });
    const select = "prmtk_budgetheaderid,prmtk_budgetname,_prmtk_application_value,prmtk_totalbudget,prmtk_versionnumber,prmtk_status";
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
    console.error("[Budget] getBudgetHeader error:", err);
    res.status(502).json({ error: "Budget API error", details: String(err) });
  }
};

/** POST /api/budget/headers - create header */
export const createBudgetHeader: RequestHandler = async (req, res) => {
  try {
    const { applicationId, budgetName, totalBudget } = req.body;
    if (!applicationId) {
      return res.status(400).json({ error: "applicationId required" });
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
    const data = response.ok ? await response.json().catch(() => ({})) : await response.text();
    if (typeof data === "object") res.json(data);
    else res.send(data);
  } catch (err) {
    console.error("[Budget] createBudgetHeader error:", err);
    res.status(502).json({ error: "Budget API error", details: String(err) });
  }
};

/** GET /api/budget/line-items?budgetHeaderId=xxx */
export const getBudgetLineItems: RequestHandler = async (req, res) => {
  try {
    const budgetHeaderId = req.query.budgetHeaderId as string;
    if (!budgetHeaderId) {
      return res.status(400).json({ error: "budgetHeaderId required" });
    }
    const select = "prmtk_budgetlineitemid,prmtk_lineitemname,prmtk_category,prmtk_description,prmtk_amount,_prmtk_budgetheader_value";
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
    console.error("[Budget] getBudgetLineItems error:", err);
    res.status(502).json({ error: "Budget API error", details: String(err) });
  }
};

/** POST /api/budget/line-items - create line item */
export const createBudgetLineItem: RequestHandler = async (req, res) => {
  try {
    const { budgetHeaderId, prmtk_lineitemname, prmtk_description, prmtk_amount, prmtk_category } = req.body;
    if (!budgetHeaderId) {
      return res.status(400).json({ error: "budgetHeaderId required" });
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
    const data = response.ok ? await response.json().catch(() => ({})) : await response.text();
    if (typeof data === "object") res.json(data);
    else res.send(data);
  } catch (err) {
    console.error("[Budget] createBudgetLineItem error:", err);
    res.status(502).json({ error: "Budget API error", details: String(err) });
  }
};

/** PATCH /api/budget/line-items/:id */
export const updateBudgetLineItem: RequestHandler = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ error: "Line item id required" });
    const { prmtk_lineitemname, prmtk_description, prmtk_amount, prmtk_category } = req.body;
    const body: Record<string, unknown> = {};
    if (prmtk_lineitemname !== undefined) body.prmtk_lineitemname = prmtk_lineitemname;
    if (prmtk_description !== undefined) body.prmtk_description = prmtk_description;
    if (prmtk_amount !== undefined) body.prmtk_amount = prmtk_amount;
    if (prmtk_category !== undefined) body.prmtk_category = prmtk_category;
    const path = `/${BUDGETLINEITEMS}(${id})`;
    const response = await dataverseFetch("PATCH", path, body);
    res.status(response.status);
    if (response.headers.get("content-type")) {
      res.setHeader("Content-Type", response.headers.get("content-type")!);
    }
    const data = response.ok ? await response.json().catch(() => ({})) : await response.text();
    if (typeof data === "object") res.json(data);
    else res.send(data);
  } catch (err) {
    console.error("[Budget] updateBudgetLineItem error:", err);
    res.status(502).json({ error: "Budget API error", details: String(err) });
  }
};

/** DELETE /api/budget/line-items/:id */
export const deleteBudgetLineItem: RequestHandler = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ error: "Line item id required" });
    const path = `/${BUDGETLINEITEMS}(${id})`;
    const response = await dataverseFetch("DELETE", path);
    res.status(response.status);
    const text = await response.text();
    if (text) res.send(text);
    else res.end();
  } catch (err) {
    console.error("[Budget] deleteBudgetLineItem error:", err);
    res.status(502).json({ error: "Budget API error", details: String(err) });
  }
};

/** GET /api/budget/spends?budgetLineItemId=xxx */
export const getBudgetSpendsByLineItem: RequestHandler = async (req, res) => {
  try {
    const budgetLineItemId = req.query.budgetLineItemId as string;
    if (!budgetLineItemId) {
      return res.status(400).json({ error: "budgetLineItemId required" });
    }

    // Filter by the correct lookup field on prmtk_budgetspends:
    // Dataverse returns _prmtk_lineitem_value for the related budget line item.
    const path = `/${BUDGETSPENDS}?$filter=_prmtk_lineitem_value eq ${budgetLineItemId}`;
    const response = await dataverseFetch("GET", path);
    const data = response.ok ? await response.json() : await response.text();

    res.status(response.status);
    const contentType = response.headers.get("content-type");
    if (contentType) {
      res.setHeader("Content-Type", contentType);
    }
    if (typeof data === "object") res.json(data);
    else res.send(data);
  } catch (err) {
    console.error("[Budget] getBudgetSpendsByLineItem error:", err);
    res.status(502).json({ error: "Budget API error", details: String(err) });
  }
};

/**
 * POST /api/budget/spends/bulk
 * Upsert spend rows for a given budget line item.
 * Body: { budgetLineItemId: string, spends: { id?: string; month: string; year: string; amount: number }[] }
 */
export const upsertBudgetSpends: RequestHandler = async (req, res) => {
  try {
    const { budgetLineItemId, spends } = req.body as {
      budgetLineItemId?: string;
      spends?: { id?: string; month: string; year: string; amount: number }[];
    };

    if (!budgetLineItemId) {
      return res.status(400).json({ error: "budgetLineItemId required" });
    }
    if (!Array.isArray(spends)) {
      return res.status(400).json({ error: "spends array required" });
    }

    // Fetch existing spends for this line item so we can delete missing ones.
    // Use the actual lookup field name _prmtk_lineitem_value.
    const listPath = `/${BUDGETSPENDS}?$filter=_prmtk_lineitem_value eq ${budgetLineItemId}`;
    const existingResponse = await dataverseFetch("GET", listPath);
    const existingJson =
      existingResponse.ok ? await existingResponse.json() : { value: [] };
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

    // Delete spends that are no longer present in the incoming list
    for (const ex of existing) {
      const id = ex["prmtk_budgetspendid"] as string | undefined;
      if (id && !incomingById.has(id)) {
        const deletePath = `/${BUDGETSPENDS}(${id})`;
        await dataverseFetch("DELETE", deletePath);
      }
    }

    // Upsert incoming spends (PATCH when id present, otherwise POST)
    for (const s of spends) {
      const amount = Number(s.amount) || 0;
      const body: Record<string, unknown> = {
        // Store the amount in the Dataverse "spent" field so it matches
        // prmtk_spent/prmtk_spent_base from the API payload.
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
          // Bind to the budget line item via the correct navigation property.
          "prmtk_LineItem@odata.bind": `/${BUDGETLINEITEMS}(${budgetLineItemId})`,
        };
        await dataverseFetch("POST", `/${BUDGETSPENDS}`, createBody);
      }
    }

    // Re-fetch updated spends to return to client
    const finalResponse = await dataverseFetch("GET", listPath);
    const finalJson =
      finalResponse.ok ? await finalResponse.json() : { value: [] };
    const rows: any[] = Array.isArray(finalJson.value) ? finalJson.value : [];

    const totalSpend = rows.reduce(
      (sum, r) => sum + (Number(r["prmtk_amount"]) || 0),
      0,
    );

    res.status(200).json({ value: rows, totalSpend });
  } catch (err) {
    console.error("[Budget] upsertBudgetSpends error:", err);
    res.status(502).json({ error: "Budget API error", details: String(err) });
  }
};
