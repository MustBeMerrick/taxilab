import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const taxYear = 2026;

  const marc = await prisma.earner.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: "Marc",
      w4Config: {
        create: {
          filingStatusOnW4: "mfj",
          multipleJobsChecked: true,
          dependentsCredit: 0,
          otherIncome: 0,
          deductionsAdj: 0,
          extraWithholding: 0,
          payFrequency: "biweekly",
        },
      },
      de4Config: {
        create: {
          filingStatus: "mfj-two-incomes",
          regularAllowances: 1,
          estimatedDeductions: 0,
          additionalWithholding: 0,
          payFrequency: "biweekly",
        },
      },
    },
  });

  const spouse = await prisma.earner.upsert({
    where: { id: 2 },
    update: {},
    create: {
      name: "Spouse",
      w4Config: {
        create: {
          filingStatusOnW4: "mfj",
          multipleJobsChecked: true,
          dependentsCredit: 0,
          otherIncome: 0,
          deductionsAdj: 0,
          extraWithholding: 0,
          payFrequency: "biweekly",
        },
      },
      de4Config: {
        create: {
          filingStatus: "mfj-two-incomes",
          regularAllowances: 1,
          estimatedDeductions: 0,
          additionalWithholding: 0,
          payFrequency: "biweekly",
        },
      },
    },
  });

  await prisma.taxProfile.upsert({
    where: { year: taxYear },
    update: {},
    create: {
      year: taxYear,
      filingStatus: "mfj",
      dependents: 0,
      useItemized: false,
      itemizedFederal: 0,
      itemizedCA: 0,
      otherJointIncome: 0,
    },
  });

  const account = await prisma.brokerageAccount.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: "Joint Taxable Brokerage",
      kind: "taxable",
    },
  });

  await prisma.brokerageEstimate.upsert({
    where: { accountId_year: { accountId: account.id, year: taxYear } },
    update: {},
    create: {
      accountId: account.id,
      year: taxYear,
      stGainsMode: "manual",
      stGainsAnnual: 0,
      ltGainsMode: "manual",
      ltGainsAnnual: 0,
      qualifiedDivMode: "manual",
      qualifiedDivAnnual: 0,
      ordinaryDivMode: "manual",
      ordinaryDivAnnual: 0,
      interestMode: "manual",
      interestAnnual: 0,
    },
  });

  console.log(`Seeded earners: ${marc.name} (#${marc.id}), ${spouse.name} (#${spouse.id})`);
  console.log(`Seeded TaxProfile for ${taxYear} and one BrokerageAccount.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
