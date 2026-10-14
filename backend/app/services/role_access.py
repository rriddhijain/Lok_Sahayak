"""Demo role policy; a real deployment must bind roles to authenticated sessions."""
ADMIN = "Hospital Administrator"
INVENTORY = "Inventory Manager"
PROCUREMENT = "Procurement Officer"
ROLES = {ADMIN, INVENTORY, PROCUREMENT}

def allows_path(role, path):
    if role == ADMIN:
        return True
    if path == "/api/stream/sse":
        return role in ROLES
    if role == INVENTORY:
        return path.startswith("/api/inventory/")
    if role == PROCUREMENT:
        return path.startswith("/api/procurement/")
    return False

def allows_event(role, event):
    if role == ADMIN:
        return True
    shared = {"PO_APPROVED", "ORDER_UPDATED", "EMERGENCY_MODE_STATE"}
    return event in shared or (role == INVENTORY and event == "INVENTORY_UPDATE")
