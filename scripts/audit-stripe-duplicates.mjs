import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("STRIPE_SECRET_KEY is not set");
  process.exit(1);
}

const stripe = new Stripe(key, { apiVersion: "2025-12-15.clover" });
const byEmail = new Map();

let startingAfter = undefined;

for (;;) {
  const page = await stripe.customers.list({
    limit: 100,
    ...(startingAfter ? { starting_after: startingAfter } : {}),
  });

  for (const customer of page.data) {
    if (customer.deleted) continue;
    const email = (customer.email ?? "").trim().toLowerCase();
    if (!email) continue;
    const existing = byEmail.get(email) ?? [];
    existing.push({
      id: customer.id,
      created: customer.created,
      name: customer.name ?? null,
      appUserId: customer.metadata?.appUserId ?? null,
    });
    byEmail.set(email, existing);
  }

  if (!page.has_more || page.data.length === 0) break;
  startingAfter = page.data[page.data.length - 1].id;
}

const duplicates = Array.from(byEmail.entries())
  .filter(([, customers]) => customers.length > 1)
  .sort((a, b) => a[0].localeCompare(b[0]));

console.log(JSON.stringify({
  duplicateEmails: duplicates.length,
  duplicates,
}, null, 2));
