-- CreateTable
CREATE TABLE "Earner" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Paycheck" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "earnerId" INTEGER NOT NULL,
    "payDate" DATETIME NOT NULL,
    "gross" REAL NOT NULL,
    "federalWH" REAL NOT NULL,
    "stateWH" REAL NOT NULL,
    "oasdi" REAL NOT NULL,
    "medicare" REAL NOT NULL,
    "caSdi" REAL NOT NULL,
    "hsaPreTax" REAL NOT NULL,
    "nonHsaPreTax" REAL NOT NULL,
    "gtli" REAL NOT NULL,
    "employerHsa" REAL NOT NULL,
    "takeHome" REAL NOT NULL,
    "paidOut" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Paycheck_earnerId_fkey" FOREIGN KEY ("earnerId") REFERENCES "Earner" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "W4Config" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "earnerId" INTEGER NOT NULL,
    "filingStatusOnW4" TEXT NOT NULL,
    "multipleJobsChecked" BOOLEAN NOT NULL,
    "dependentsCredit" REAL NOT NULL,
    "otherIncome" REAL NOT NULL,
    "deductionsAdj" REAL NOT NULL,
    "extraWithholding" REAL NOT NULL,
    "payFrequency" TEXT NOT NULL,
    CONSTRAINT "W4Config_earnerId_fkey" FOREIGN KEY ("earnerId") REFERENCES "Earner" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DE4Config" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "earnerId" INTEGER NOT NULL,
    "filingStatus" TEXT NOT NULL,
    "regularAllowances" INTEGER NOT NULL,
    "estimatedDeductions" INTEGER NOT NULL,
    "additionalWithholding" REAL NOT NULL,
    "payFrequency" TEXT NOT NULL,
    CONSTRAINT "DE4Config_earnerId_fkey" FOREIGN KEY ("earnerId") REFERENCES "Earner" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TaxProfile" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "year" INTEGER NOT NULL,
    "filingStatus" TEXT NOT NULL,
    "dependents" INTEGER NOT NULL,
    "useItemized" BOOLEAN NOT NULL,
    "itemizedFederal" REAL NOT NULL,
    "itemizedCA" REAL NOT NULL,
    "otherJointIncome" REAL NOT NULL
);

-- CreateTable
CREATE TABLE "BrokerageAccount" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "BrokerageEstimate" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "accountId" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "stGainsMode" TEXT NOT NULL,
    "stGainsAnnual" REAL,
    "stGainsYtd" REAL,
    "stGainsAsOf" DATETIME,
    "ltGainsMode" TEXT NOT NULL,
    "ltGainsAnnual" REAL,
    "ltGainsYtd" REAL,
    "ltGainsAsOf" DATETIME,
    "qualifiedDivMode" TEXT NOT NULL,
    "qualifiedDivAnnual" REAL,
    "qualifiedDivYtd" REAL,
    "qualifiedDivAsOf" DATETIME,
    "ordinaryDivMode" TEXT NOT NULL,
    "ordinaryDivAnnual" REAL,
    "ordinaryDivYtd" REAL,
    "ordinaryDivAsOf" DATETIME,
    "interestMode" TEXT NOT NULL,
    "interestAnnual" REAL,
    "interestYtd" REAL,
    "interestAsOf" DATETIME,
    CONSTRAINT "BrokerageEstimate_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "BrokerageAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Paycheck_earnerId_payDate_idx" ON "Paycheck"("earnerId", "payDate");

-- CreateIndex
CREATE UNIQUE INDEX "W4Config_earnerId_key" ON "W4Config"("earnerId");

-- CreateIndex
CREATE UNIQUE INDEX "DE4Config_earnerId_key" ON "DE4Config"("earnerId");

-- CreateIndex
CREATE UNIQUE INDEX "TaxProfile_year_key" ON "TaxProfile"("year");

-- CreateIndex
CREATE UNIQUE INDEX "BrokerageEstimate_accountId_year_key" ON "BrokerageEstimate"("accountId", "year");
