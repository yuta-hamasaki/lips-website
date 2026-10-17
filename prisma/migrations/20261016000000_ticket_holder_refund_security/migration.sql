-- Approved migration plan; apply only to the explicitly selected database.
-- Pause checkout/issuance/check-in workers while migrating and deploying code.
BEGIN;
SET LOCAL lock_timeout = '5s';
ALTER TABLE "Ticket" ADD COLUMN "holderName" TEXT;
UPDATE "Ticket" AS t
SET "holderName" = c."name"
FROM "Order" AS o JOIN "Customer" AS c ON c."id" = o."customerId"
WHERE t."orderId" = o."id";
ALTER TABLE "Ticket" ALTER COLUMN "holderName" SET NOT NULL;

-- A permanent tombstone is required even when the order does not yet exist.
CREATE TABLE "RefundedPayment" (
  "paymentIntentId" TEXT NOT NULL,
  "stripeEventId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RefundedPayment_pkey" PRIMARY KEY ("paymentIntentId")
);
CREATE UNIQUE INDEX "RefundedPayment_stripeEventId_key" ON "RefundedPayment"("stripeEventId");

-- holderName is a creation-time snapshot, including for direct database writers.
CREATE FUNCTION prevent_ticket_holder_name_change() RETURNS trigger AS $$
BEGIN
  IF NEW."holderName" IS DISTINCT FROM OLD."holderName" THEN
    RAISE EXCEPTION 'Ticket holder name is immutable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER ticket_holder_name_immutable BEFORE UPDATE OF "holderName" ON "Ticket"
FOR EACH ROW EXECUTE FUNCTION prevent_ticket_holder_name_change();
COMMIT;
