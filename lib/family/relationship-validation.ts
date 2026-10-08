import type { PrismaClient } from "@prisma/client";

type DbLike = PrismaClient | any;

async function collectAncestorIds(
  db: DbLike,
  startId: string,
  visited: Set<string>,
  depth = 0,
): Promise<void> {
  if (!startId || visited.has(startId) || depth > 12) return;
  visited.add(startId);
  const node = await db.resident.findUnique({
    where: { id: startId },
    select: { fatherResidentId: true, motherResidentId: true },
  });
  if (!node) return;
  if (node.fatherResidentId) await collectAncestorIds(db, node.fatherResidentId, visited, depth + 1);
  if (node.motherResidentId) await collectAncestorIds(db, node.motherResidentId, visited, depth + 1);
}

export async function validateFamilyGraphForCreate(
  db: DbLike,
  options: {
    fatherResidentId?: string | null;
    motherResidentId?: string | null;
    householdId?: string | null;
    linkedHeadResidentId?: string | null;
  },
): Promise<string | null> {
  const father = options.fatherResidentId?.trim() || null;
  const mother = options.motherResidentId?.trim() || null;

  if (father && mother && father === mother) {
    return "Father and mother cannot be the same resident";
  }

  if (father) {
    const f = await db.resident.findUnique({ where: { id: father }, select: { id: true, householdId: true } });
    if (!f) return "Selected father does not exist";
    if (options.householdId && f.householdId && options.householdId !== f.householdId) {
      return "Father must belong to the same family/household";
    }
  }
  if (mother) {
    const m = await db.resident.findUnique({ where: { id: mother }, select: { id: true, householdId: true } });
    if (!m) return "Selected mother does not exist";
    if (options.householdId && m.householdId && options.householdId !== m.householdId) {
      return "Mother must belong to the same family/household";
    }
  }

  if (options.linkedHeadResidentId) {
    const head = await db.resident.findUnique({
      where: { id: options.linkedHeadResidentId },
      select: { id: true, householdRole: true },
    });
    if (!head || head.householdRole !== "head") return "Invalid linked family head";
  }

  return null;
}

export async function validateFamilyGraphForUpdate(
  db: DbLike,
  options: {
    residentId: string;
    fatherResidentId?: string | null;
    motherResidentId?: string | null;
    householdId?: string | null;
  },
): Promise<string | null> {
  const selfId = options.residentId;
  const father = options.fatherResidentId?.trim() || null;
  const mother = options.motherResidentId?.trim() || null;

  if (father && father === selfId) return "Resident cannot be their own father";
  if (mother && mother === selfId) return "Resident cannot be their own mother";
  if (father && mother && father === mother) return "Father and mother cannot be the same resident";

  const ancestors = new Set<string>();
  await collectAncestorIds(db, selfId, ancestors);
  if (father && ancestors.has(father)) return "Circular relationship detected for father linkage";
  if (mother && ancestors.has(mother)) return "Circular relationship detected for mother linkage";

  if (father) {
    const f = await db.resident.findUnique({ where: { id: father }, select: { id: true, householdId: true } });
    if (!f) return "Selected father does not exist";
    if (options.householdId && f.householdId && options.householdId !== f.householdId) {
      return "Father must belong to the same family/household";
    }
  }
  if (mother) {
    const m = await db.resident.findUnique({ where: { id: mother }, select: { id: true, householdId: true } });
    if (!m) return "Selected mother does not exist";
    if (options.householdId && m.householdId && options.householdId !== m.householdId) {
      return "Mother must belong to the same family/household";
    }
  }
  return null;
}

