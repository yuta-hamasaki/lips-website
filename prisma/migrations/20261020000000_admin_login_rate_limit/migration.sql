CREATE TABLE "AdminLoginRateLimit" (
  "key" TEXT NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "resetAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AdminLoginRateLimit_pkey" PRIMARY KEY ("key")
);

ALTER TABLE "Order" ADD COLUMN "ticketEmailClaimedAt" TIMESTAMP(3);
