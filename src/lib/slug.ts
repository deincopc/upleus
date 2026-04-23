import { prisma } from "./prisma";

export function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 48);
}

export async function uniqueSlug(name: string, excludeId?: string): Promise<string> {
  const base = toSlug(name);
  let slug = base;
  let i = 2;

  while (true) {
    const existing = await prisma.project.findUnique({ where: { slug } });
    if (!existing || existing.id === excludeId) break;
    slug = `${base}-${i++}`;
  }

  return slug;
}
