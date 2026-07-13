-- Take-home pay is fully derived (gross minus federalWH/stateWH/oasdi/
-- medicare/caSdi/hsaPreTax/nonHsaPreTax) and no longer stored.
ALTER TABLE "Paycheck" DROP COLUMN "takeHome";
