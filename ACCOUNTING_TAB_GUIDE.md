# Accounting tab — how it all works

This is a plain-language walkthrough of every sub-tab under Admin → Accounting, what
each number means, where it comes from, and how the pieces connect. Written after the
2026-07-20 session that fixed the inflated "finished goods at listed price" figure,
added per-roll purchase pricing, reworked the lace-color recipe editor, and flagged
manual storefront stock numbers not backed by warehouse inventory.

## The core idea: two kinds of "stock"

There are two completely separate stock numbers in this app, and mixing them up is the
source of most confusion:

1. **Warehouse stock (accounting truth)** — tracked in `FinishedGoodsLot` /
   `FinishedGoodsInventories` and `MaterialLot`. This is what FIFO costing, P&L, and
   inventory valuation actually use. It only changes when you log a **Production** run
   or a **Purchase**, and gets consumed when a **Sale** happens.
2. **Storefront stock (`Product.QuantityInStock` / `ProductVariantStock`)** — the number
   shown to customers on the product page, entered manually per color/size/lace variant
   in the product creation/edit form. It is *not* automatically derived from warehouse
   stock — you either type a number by hand, or click "Use stock (N)" to pull the real
   warehouse-available quantity into that field.

If you type a storefront stock number without ever clicking "Use stock," that variant's
row now shows **"fake number (no warehouse stock)"** next to the input — meaning
nothing in the warehouse actually backs that number. It's fine for pre-orders or
made-to-order listings, but worth knowing it's disconnected from real inventory.

## Suppliers / Purchases (Procurement)

Where you record buying raw materials. Each purchase order line:
- Picks a **Material** and a **quantity** (in the material's base unit, e.g. meters).
- Has a **Unit price** (price per base unit) and VAT.
- Locks in an **exchange rate** to the base currency (UAH) at the order date.

**Roll-tracked materials** (lace, ribbon, anything sold by the roll/spool with a fixed
length): turn on `Track by item` on the Material, set a default length per roll. Then
on the purchase line you enter **Rolls** and **Length each**, which multiply out to the
quantity automatically. The **Price per roll** field lets you enter the price exactly as
it's written on the supplier's invoice (per roll) — the system divides it by the roll
length behind the scenes to get the per-meter cost that FIFO needs. You never have to
do that division by hand.

Every purchase line becomes a **raw material lot** with its own locked-in unit cost —
this is the first half of FIFO (materials → production).

## Stock (merged tab: materials + finished goods)

Two tables in one place now (previously two separate tabs):
- **Materials** — current quantity remaining per material, summed across all its lots,
  with a low-stock flag when it's under the reorder threshold. "Hide zero-stock
  materials" filters out anything at 0.
- **Finished goods** (`AdminFinishedStockView`) — current quantity on hand per
  product, valued at the cost of the specific FIFO lots still remaining (not a blended
  average — each production run's real cost is tracked separately until it's sold).

## Production

Where you log a completed production run: pick a product, a quantity, and the system
walks through the product's BOM (bill of materials) consuming raw material lots
**one unit at a time, in FIFO order** (oldest/cheapest lot first). If a run happens to
straddle two material lots mid-run (e.g. you started a roll that was almost empty),
the run is split into multiple `FinishedGoodsLot` rows internally so each unit keeps
its true cost — this is what makes finished-goods valuation and COGS-on-sale accurate
down to the unit, not just an average.

Voiding a production order reverses every lot it created and gives back the raw
materials it consumed.

Production can also be logged for **internal components** like per-color lace (see
below) — they go through the exact same FIFO/BOM machinery as bags.

## Products (BOM, pricing, sale recipe)

This is the accounting-side product editor (`AdminProductAccountingView`), separate
from the storefront listing form. Three things you configure per product:

- **BOM** — which materials + quantities + labour cost go into making one unit. This
  drives both production costing and the margin calculation below.
- **Pricing** — selling price, currency, and a margin alert threshold (%). If the
  product's true FIFO-based cost eats more than that % of the selling price, it gets
  flagged.
- **Sale recipe** — how a sale of this product expands into multiple line items. This
  is the lace/packaging composition system:
  - **Internal component** checkbox: turn this on for products like "Lace Yellow" that
    should never be sold on their own, only composed onto other products. Internal
    products are hidden from the public storefront catalog and excluded from
    "potential revenue if sold" figures (see Reports below) — but they're still fully
    tracked through Production/BOM/FIFO like any other product.
  - **"With lace" rows**: each row maps one **bag color** to one **lace product**.
    Pick the color the customer should be able to choose, and the matching lace
    product is auto-suggested (e.g. "Lace Yellow" for color "Yellow") — override it if
    it guessed wrong. A bag can have several of these rows (Yellow, Black, Red, …) so
    the customer picks a lace color independently of the bag's own color, defaulting
    to the bag's own color on the product page.
  - **"Always" rows**: composed on every sale regardless of any choice — this is for
    packaging that always ships with the product.
  - Each composed component is billed and stocked as **its own separate order line**,
    at its own price, with its own FIFO cost consumption — not bundled invisibly into
    the bag's line. This is what makes returns/voids work correctly per-component.

Bags with an old "with_lace" row that has no color assigned are flagged with a warning
("needs lace color mapping") — they silently don't offer lace to customers until
reconfigured, rather than erroring out.

## Sales

Recording an offline/manual sale. Selecting "With lace" on a sale line shows a color
dropdown (only when the product has color-mapped lace options configured); the chosen
color determines which lace product gets composed onto that sale, consumed via FIFO
from its own stock.

## Returns

Three resolutions when a customer returns an item:
- **Restock** — the returned unit goes back into finished-goods stock at its original
  cost, sellable again.
- **Write off** — the unit is scrapped; its cost hits the P&L as a loss, not restocked.
- **Reclaim materials** — traces the returned unit back through its exact production
  run to the original raw-material lots and returns *those* to raw stock (used when the
  finished item itself can't be resold, but its materials can be salvaged).

Returns also proportionally reverse the platform channel fee that was charged on the
original sale, and (for component sales) can't return more of a lace/packaging line
than was returned of its parent bag line.

## Reports (P&L, VAT, inventory valuation)

- **P&L** — revenue minus refunds, minus COGS (from the FIFO lots actually consumed),
  minus channel fees (net of any reversed on returns), minus operating expenses, plus
  scrap cost from write-offs shown as its own line.
- **Inventory valuation**:
  - Raw materials at cost (remaining lot quantities × their locked-in cost).
  - Finished goods at cost (remaining FIFO lots × their true production cost).
  - **"Finished goods if sold at listed price"** — what you'd take in if every unit
    currently on hand sold at its current listed price. This only counts
    non-internal, customer-facing products' warehouse stock — internal components
    like per-color lace are excluded, because those units are already priced into the
    bag's own potential-revenue figure and would otherwise be counted twice.

## Operating Expenses & Customers

Straightforward CRUD for recurring/one-off business expenses and the customer list
used on manual sales orders — nothing accounting-specific beyond standard record
keeping.

## What still needs a human, not code

- Creating the actual per-color lace **products** (with correct pricing) and wiring up
  each bag's sale recipe rows is a content/data-entry task, not something the system
  can infer — someone has to decide which lace colors exist and what they cost.
- A storefront stock number flagged "fake number (no warehouse stock)" needs either a
  real Production run logged for that variant, or a conscious decision to keep selling
  it as made-to-order.
