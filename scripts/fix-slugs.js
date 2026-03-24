const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function ensureUniqueSlug(base) {
  let candidate = base;
  let suffix = 1;
  while (true) {
    const existing = await db.product.findUnique({ where: { slug: candidate } });
    if (!existing) return candidate;
    candidate = `${base}-${suffix++}`;
  }
}

(async () => {
  try {
    const products = await db.product.findMany({});
    let updated = 0;
    for (const p of products) {
      if (!p.slug || p.slug.trim() === '') {
        const base = slugify(p.title || 'product');
        const unique = await ensureUniqueSlug(base || `product-${p.id.slice(-6)}`);
        await db.product.update({ where: { id: p.id }, data: { slug: unique } });
        console.log(`Fixed slug for ${p.title} -> ${unique}`);
        updated++;
      }
    }
    console.log(`Done. Updated ${updated} product(s).`);
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
})();