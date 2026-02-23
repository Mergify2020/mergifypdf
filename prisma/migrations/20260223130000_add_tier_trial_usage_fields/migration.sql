-- Track trial usage by plan tier:
-- Essential Plus trial can be followed by Signature Pro trial,
-- but Signature Pro trial is the highest tier and blocks further trials.
ALTER TABLE "User"
ADD COLUMN "essentialPlusTrialUsedAt" TIMESTAMP(3),
ADD COLUMN "signatureProTrialUsedAt" TIMESTAMP(3);

-- Legacy rows had a single global trial flag. Backfill to Signature Pro usage
-- to avoid granting unexpected additional trials after rollout.
UPDATE "User"
SET "signatureProTrialUsedAt" = "trialUsedAt"
WHERE "trialUsedAt" IS NOT NULL
  AND "essentialPlusTrialUsedAt" IS NULL
  AND "signatureProTrialUsedAt" IS NULL;
