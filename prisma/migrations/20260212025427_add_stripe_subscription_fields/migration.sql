-- AlterTable
ALTER TABLE "User" ADD COLUMN     "pendingCheckoutCreatedAt" TIMESTAMP(3),
ADD COLUMN     "pendingCheckoutId" TEXT,
ADD COLUMN     "stripeCurrentPeriodEnd" TIMESTAMP(3),
ADD COLUMN     "stripeCustomerId" TEXT,
ADD COLUMN     "stripePriceId" TEXT,
ADD COLUMN     "stripeStatus" TEXT,
ADD COLUMN     "stripeSubscriptionId" TEXT,
ADD COLUMN     "trialUsedAt" TIMESTAMP(3);
