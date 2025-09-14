import { db, redirectRules } from '@/lib/db'
import { eq, and, asc } from 'drizzle-orm'

export interface RedirectRule {
  id: string
  pattern: string
  replacement: string
  flags?: string
  enabled: boolean
  priority: number
}

/**
 * Apply redirect rules to a path in priority order
 * @param path - The path to transform
 * @param rules - Array of rules to apply
 * @returns Transformed path or null if no rules match
 */
export function applyRules(path: string, rules: RedirectRule[]): string | null {
  // Sort rules by priority (ascending - lower numbers have higher priority)
  const sortedRules = rules
    .filter(rule => rule.enabled)
    .sort((a, b) => a.priority - b.priority)

  for (const rule of sortedRules) {
    try {
      const flags = rule.flags || 'g'
      const regex = new RegExp(rule.pattern, flags)
      
      if (regex.test(path)) {
        const transformedPath = path.replace(regex, rule.replacement)
        
        // Only return if the path actually changed
        if (transformedPath !== path) {
          return transformedPath
        }
      }
    } catch (error) {
      console.error(`Invalid regex pattern in rule ${rule.id}:`, error)
      continue
    }
  }
  
  return null
}

/**
 * Get all redirect rules for a shop
 * @param shopId - The shop ID
 * @returns Array of redirect rules
 */
export async function getRules(shopId: string): Promise<RedirectRule[]> {
  const rules = await db
    .select({
      id: redirectRules.id,
      pattern: redirectRules.pattern,
      replacement: redirectRules.replacement,
      flags: redirectRules.flags,
      enabled: redirectRules.enabled,
      priority: redirectRules.priority,
    })
    .from(redirectRules)
    .where(eq(redirectRules.shopId, shopId))
    .orderBy(asc(redirectRules.priority))

  return rules.map(rule => ({
    id: rule.id,
    pattern: rule.pattern,
    replacement: rule.replacement,
    flags: rule.flags || undefined,
    enabled: rule.enabled,
    priority: rule.priority,
  }))
}

/**
 * Create a new redirect rule
 * @param shopId - The shop ID
 * @param rule - Rule data
 * @returns Created rule ID
 */
export async function createRule(
  shopId: string,
  rule: Omit<RedirectRule, 'id'>
): Promise<string> {
  const ruleId = crypto.randomUUID()
  
  await db.insert(redirectRules).values({
    id: ruleId,
    shopId,
    pattern: rule.pattern,
    replacement: rule.replacement,
    flags: rule.flags,
    enabled: rule.enabled,
    priority: rule.priority,
    createdAt: new Date(),
    updatedAt: new Date(),
  })
  
  return ruleId
}

/**
 * Update an existing redirect rule
 * @param ruleId - The rule ID
 * @param updates - Fields to update
 */
export async function updateRule(
  ruleId: string,
  updates: Partial<Omit<RedirectRule, 'id'>>
): Promise<void> {
  const updateData: any = {
    updatedAt: new Date(),
  }
  
  if (updates.pattern !== undefined) updateData.pattern = updates.pattern
  if (updates.replacement !== undefined) updateData.replacement = updates.replacement
  if (updates.flags !== undefined) updateData.flags = updates.flags
  if (updates.enabled !== undefined) updateData.enabled = updates.enabled
  if (updates.priority !== undefined) updateData.priority = updates.priority
  
  await db
    .update(redirectRules)
    .set(updateData)
    .where(eq(redirectRules.id, ruleId))
}

/**
 * Delete a redirect rule
 * @param ruleId - The rule ID
 */
export async function deleteRule(ruleId: string): Promise<void> {
  await db
    .delete(redirectRules)
    .where(eq(redirectRules.id, ruleId))
}

/**
 * Test a single rule against a path
 * @param path - The path to test
 * @param rule - The rule to test
 * @returns Result or null if no match
 */
export function testRule(path: string, rule: RedirectRule): string | null {
  if (!rule.enabled) {
    return null
  }
  
  try {
    const flags = rule.flags || 'g'
    const regex = new RegExp(rule.pattern, flags)
    
    if (regex.test(path)) {
      const transformedPath = path.replace(regex, rule.replacement)
      return transformedPath !== path ? transformedPath : null
    }
  } catch (error) {
    console.error(`Invalid regex pattern in rule ${rule.id}:`, error)
  }
  
  return null
}
