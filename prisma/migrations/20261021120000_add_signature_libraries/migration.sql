-- Persistent, account-scoped libraries for typed, drawn, phone, and uploaded signatures.
CREATE TABLE "SignatureLibrary" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "signatures" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SignatureLibrary_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SignatureLibrary_userId_key" ON "SignatureLibrary"("userId");

ALTER TABLE "SignatureLibrary"
ADD CONSTRAINT "SignatureLibrary_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
