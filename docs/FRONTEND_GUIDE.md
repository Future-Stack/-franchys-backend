# Frontend Guide: 2D Price Matrix & Volume Pooling

A quick reference for the frontend team on what changed and how to use it.

---

## 1. Price Matrix UI (Settings)

Matrices now support multiple columns (e.g., "1 Color", "2 Colors") in addition to quantities.

### Payload to Save Matrix:

`POST /api/v1/price-matrics` or `PATCH /api/v1/price-matrics/:id`

```json
{
  "name": "Screen Printing",
  "priceType": "fixed",
  "columns": ["1 Color", "2 Colors"],
  "priceTiers": [
    {
      "quantity": 12,
      "markup": 20,
      "columnPrices": {
        "1 Color": 3.5,
        "2 Colors": 4.5
      }
    },
    {
      "quantity": 36,
      "markup": 10,
      "columnPrices": {
        "1 Color": 2.0,
        "2 Colors": 3.0
      }
    }
  ]
}
```

- **`columns`**: Array of column names.
- **`columnPrices`**: Price per column for that tier.

---

## 2. Quote Line Item UI

Line items now have a `matrixColumn` field.

### How it works in the UI:

1. When a user selects a **Price Matrix** on a line item:
   - If that matrix has `columns`, show a dropdown containing those columns.
   - User picks one (e.g. `"2 Colors"`).
2. Send `matrixColumn` with the line item when calculating or saving quotes.

### Line Item Payload:

```json
{
  "description": "Black T-Shirt",
  "baseCost": 10.0,
  "matrixId": "matrix-uuid-here",
  "matrixColumn": "2 Colors",
  "sizeBreakdown": { "S": 10, "M": 10 }
}
```

### Live Calculation Endpoints:

- **New / Unsaved Quotes**: `POST /api/v1/quote/refresh-pricing/new`
- **Existing Quotes**: `POST /api/v1/quote/:id/refresh-pricing/existing`

> **Note**: Frontend does **not** need to calculate prices. The backend automatically calculates and returns `markupPrice`, `printCost`, `unitPrice`, and line `total`.

---

## 3. Automatic Volume Pooling

The backend handles this automatically:

- If multiple line items in the **same group** share the **same `matrixId`**, their quantities are pooled together.
- Example: 20 shirts + 20 hoodies = **40 garments pooled**, unlocking the 36+ quantity discount for both items.
- Each item still gets its own column price (e.g. 1 Color price vs 2 Colors price).

---

## 4. Column Visibility Setting (Optional)

In `GET /api/v1/line-item-customization`:

- `data.columns.matrixColumn` (`boolean`): Indicates whether the matrix column selector should be visible in the quote table.
- Toggle via `PATCH /api/v1/line-item-customization`: `{ "showMatrixColumn": true }`.
