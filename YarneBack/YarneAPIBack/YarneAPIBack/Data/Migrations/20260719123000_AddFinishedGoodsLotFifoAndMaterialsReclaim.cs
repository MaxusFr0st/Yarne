using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace YarneAPIBack.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddFinishedGoodsLotFifoAndMaterialsReclaim : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_ReturnOrderItem_Money_NonNegative",
                table: "ReturnOrderItem");

            migrationBuilder.DropCheckConstraint(
                name: "CK_ReturnOrder_Resolution",
                table: "ReturnOrder");

            migrationBuilder.AddColumn<long>(
                name: "MaterialsReclaimedCents",
                table: "ReturnOrderItem",
                type: "bigint",
                nullable: false,
                defaultValue: 0L);

            migrationBuilder.CreateTable(
                name: "FinishedGoodsLot",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ProductId = table.Column<int>(type: "integer", nullable: false),
                    ProductionOrderId = table.Column<int>(type: "integer", nullable: false),
                    QuantityProduced = table.Column<int>(type: "integer", nullable: false),
                    QuantityRemaining = table.Column<int>(type: "integer", nullable: false),
                    UnitCostCents = table.Column<long>(type: "bigint", nullable: false),
                    IsVoid = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    CreatedBy = table.Column<int>(type: "integer", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FinishedGoodsLot", x => x.Id);
                    table.CheckConstraint("CK_FinishedGoodsLot_Cost_NonNegative", "\"UnitCostCents\" >= 0");
                    table.CheckConstraint("CK_FinishedGoodsLot_Quantity_Positive", "\"QuantityProduced\" > 0");
                    table.CheckConstraint("CK_FinishedGoodsLot_QuantityRemaining_Range", "\"QuantityRemaining\" >= 0 AND \"QuantityRemaining\" <= \"QuantityProduced\"");
                    table.ForeignKey(
                        name: "FK_FinishedGoodsLot_Product_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Product",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_FinishedGoodsLot_ProductionOrder_ProductionOrderId",
                        column: x => x.ProductionOrderId,
                        principalTable: "ProductionOrder",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "SalesFinishedGoodsConsumption",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    SalesOrderItemId = table.Column<int>(type: "integer", nullable: false),
                    FinishedGoodsLotId = table.Column<int>(type: "integer", nullable: false),
                    Quantity = table.Column<int>(type: "integer", nullable: false),
                    UnitCostAtSaleCents = table.Column<long>(type: "bigint", nullable: false),
                    TotalCostCents = table.Column<long>(type: "bigint", nullable: false),
                    IsVoid = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    CreatedBy = table.Column<int>(type: "integer", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SalesFinishedGoodsConsumption", x => x.Id);
                    table.CheckConstraint("CK_SalesFinishedGoodsConsumption_Cost_NonNegative", "\"UnitCostAtSaleCents\" >= 0 AND \"TotalCostCents\" >= 0");
                    table.CheckConstraint("CK_SalesFinishedGoodsConsumption_Quantity_Positive", "\"Quantity\" > 0");
                    table.ForeignKey(
                        name: "FK_SalesFinishedGoodsConsumption_FinishedGoodsLot_FinishedGood~",
                        column: x => x.FinishedGoodsLotId,
                        principalTable: "FinishedGoodsLot",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SalesFinishedGoodsConsumption_OrderItem_SalesOrderItemId",
                        column: x => x.SalesOrderItemId,
                        principalTable: "OrderItem",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.AddCheckConstraint(
                name: "CK_ReturnOrderItem_Money_NonNegative",
                table: "ReturnOrderItem",
                sql: "\"RefundAmountCents\" >= 0 AND \"VatReversedCents\" >= 0 AND \"CogsReversedCents\" >= 0 AND \"FeeReversedCents\" >= 0 AND \"MaterialsReclaimedCents\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_ReturnOrder_Resolution",
                table: "ReturnOrder",
                sql: "\"Resolution\" IN ('restock', 'reclaim_materials', 'write_off')");

            migrationBuilder.CreateIndex(
                name: "IX_FinishedGoodsLot_CreatedBy",
                table: "FinishedGoodsLot",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_FinishedGoodsLot_ProductId_Id",
                table: "FinishedGoodsLot",
                columns: new[] { "ProductId", "Id" });

            migrationBuilder.CreateIndex(
                name: "IX_FinishedGoodsLot_ProductionOrderId",
                table: "FinishedGoodsLot",
                column: "ProductionOrderId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SalesFinishedGoodsConsumption_CreatedBy",
                table: "SalesFinishedGoodsConsumption",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_SalesFinishedGoodsConsumption_FinishedGoodsLotId",
                table: "SalesFinishedGoodsConsumption",
                column: "FinishedGoodsLotId");

            migrationBuilder.CreateIndex(
                name: "IX_SalesFinishedGoodsConsumption_SalesOrderItemId",
                table: "SalesFinishedGoodsConsumption",
                column: "SalesOrderItemId");

            // Backfill: production predates FG-lot tracking, so historical sales were never
            // recorded against a specific lot. Reconstruct lots assuming historical sales
            // consumed FIFO too — i.e. whatever quantity is still on hand today must be the
            // most recently produced units, oldest runs having already sold through first.
            migrationBuilder.Sql(
                """
                WITH ordered_runs AS (
                    SELECT
                        po."Id" AS production_order_id,
                        po."ProductId" AS product_id,
                        (po."QuantityProduced" - po."QuantityRejected") AS accepted_qty,
                        po."CapitalizedCogsCents" AS capitalized_cogs,
                        ROW_NUMBER() OVER (
                            PARTITION BY po."ProductId"
                            ORDER BY po."ProductionDate" DESC, po."Id" DESC
                        ) AS rn_desc
                    FROM "ProductionOrder" po
                    WHERE po."IsVoid" = false AND po."Status" = 'completed'
                        AND (po."QuantityProduced" - po."QuantityRejected") > 0
                ),
                with_running AS (
                    SELECT
                        r.*,
                        SUM(accepted_qty) OVER (
                            PARTITION BY product_id
                            ORDER BY rn_desc
                            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
                        ) AS running_from_newest
                    FROM ordered_runs r
                ),
                with_onhand AS (
                    SELECT w.*, COALESCE(fgi."QuantityOnHand", 0) AS qty_on_hand
                    FROM with_running w
                    LEFT JOIN "FinishedGoodsInventory" fgi ON fgi."ProductId" = w.product_id
                )
                INSERT INTO "FinishedGoodsLot"
                    ("ProductId", "ProductionOrderId", "QuantityProduced", "QuantityRemaining",
                     "UnitCostCents", "IsVoid", "CreatedAt", "UpdatedAt")
                SELECT
                    product_id,
                    production_order_id,
                    accepted_qty,
                    GREATEST(0, LEAST(accepted_qty, qty_on_hand - (running_from_newest - accepted_qty))),
                    CASE WHEN accepted_qty > 0
                        THEN ROUND(capitalized_cogs::numeric / accepted_qty)
                        ELSE 0
                    END,
                    false,
                    CURRENT_TIMESTAMP,
                    CURRENT_TIMESTAMP
                FROM with_onhand;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SalesFinishedGoodsConsumption");

            migrationBuilder.DropTable(
                name: "FinishedGoodsLot");

            migrationBuilder.DropCheckConstraint(
                name: "CK_ReturnOrderItem_Money_NonNegative",
                table: "ReturnOrderItem");

            migrationBuilder.DropCheckConstraint(
                name: "CK_ReturnOrder_Resolution",
                table: "ReturnOrder");

            migrationBuilder.DropColumn(
                name: "MaterialsReclaimedCents",
                table: "ReturnOrderItem");

            migrationBuilder.AddCheckConstraint(
                name: "CK_ReturnOrderItem_Money_NonNegative",
                table: "ReturnOrderItem",
                sql: "\"RefundAmountCents\" >= 0 AND \"VatReversedCents\" >= 0 AND \"CogsReversedCents\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_ReturnOrder_Resolution",
                table: "ReturnOrder",
                sql: "\"Resolution\" IN ('restock', 'write_off')");
        }
    }
}
