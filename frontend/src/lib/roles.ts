export const ADMIN = "Hospital Administrator";
export const INVENTORY = "Inventory Manager";
export const PROCUREMENT = "Procurement Officer";
export type WorkRole = typeof ADMIN | typeof INVENTORY | typeof PROCUREMENT;
export const allowedTabs: Record<string, string[]> = {
  [ADMIN]: ["command-center", "inventory", "forecast", "emergency", "procurement"],
  [INVENTORY]: ["inventory"],
  [PROCUREMENT]: ["procurement"],
};
export function canAccessTab(role: string, tab: string) {return allowedTabs[role]?.includes(tab) ?? false;}
export function homeTab(role: string) {return allowedTabs[role]?.[0] || "command-center";}
export function arrivalText(order: {days_until_arrival:number; overdue_days:number; delivery_status:string}) {
  if (order.delivery_status === "OVERDUE") return `Delivery overdue by ${order.overdue_days} ${order.overdue_days === 1 ? "day" : "days"}`;
  if (order.delivery_status === "TODAY") return "Expected today";
  return `Expected in ${order.days_until_arrival} ${order.days_until_arrival === 1 ? "day" : "days"}`;
}
