"""Regression workflows against isolated SQLite, never the user's database."""
import os
import tempfile
import unittest
from pathlib import Path
from fastapi.testclient import TestClient

_tmp = tempfile.TemporaryDirectory()
os.environ['DATABASE_URL'] = f"sqlite+aiosqlite:///{_tmp.name}/test.db"
from backend.main import app
from backend.app.services.ml_forecasting import DemandForecaster

class Workflows(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.context = TestClient(app)
        cls.client = cls.context.__enter__()
    @classmethod
    def tearDownClass(cls):
        cls.context.__exit__(None, None, None)
        _tmp.cleanup()
    def get(self, path):
        r = self.client.get(path)
        self.assertEqual(r.status_code, 200, r.text)
        return r.json()
    def test_01_dashboard_endpoints(self):
        for p in ['/health','/api/inventory/summary','/api/inventory/items','/api/inventory/batches','/api/procurement/reorders','/api/procurement/suppliers','/api/emergency/hospitals','/api/emergency/status','/api/nlp/alerts']:
            self.get(p)
        self.assertEqual(len(self.get('/api/inventory/items')), 12)
    def test_02_forecast_period(self):
        for days in [7,14,30,60,90]:
            data=self.get(f'/api/forecast/item/1?horizon_days={days}')
            self.assertEqual(len(data['forecast']),days)
            self.assertTrue(all(p['confidence_lower'] <= p['predicted_demand'] <= p['confidence_upper'] for p in data['forecast']))
        self.assertEqual(self.client.get('/api/forecast/item/1?horizon_days=0').status_code,422)
    def test_03_short_history(self):
        import datetime
        for n in [0,1,5,8,10,60]:
            hist=[{'date':str(datetime.date.today()-datetime.timedelta(days=n-i)), 'quantity':float(i%3+5)} for i in range(n)]
            self.assertEqual(len(DemandForecaster.forecast_item_demand(hist,100,14)['forecast']),14)
    def test_04_approve_receive(self):
        proposal=self.get('/api/procurement/reorders')[0]
        path=f"/api/procurement/reorders/approve?item_id={proposal['item_id']}&supplier_id={proposal['supplier_id']}&quantity={proposal['suggested_qty']}&unit_cost={proposal['unit_cost']}"
        res=self.client.post(path)
        self.assertEqual(res.status_code,200,res.text)
        oid=res.json()['po_id']
        self.assertEqual(self.client.post(path).status_code,409)
        self.assertNotIn(proposal['item_id'],[p['item_id'] for p in self.get('/api/procurement/reorders')])
        before=next(i['current_stock'] for i in self.get('/api/inventory/items') if i['id']==proposal['item_id'])
        self.assertEqual(before,proposal['current_stock'])
        res=self.client.patch(f'/api/procurement/orders/{oid}',json={'action':'receive'})
        self.assertEqual(res.status_code,200,res.text)
        after=next(i['current_stock'] for i in self.get('/api/inventory/items') if i['id']==proposal['item_id'])
        self.assertEqual(after,before+proposal['suggested_qty'])
        self.assertEqual(self.client.patch(f'/api/procurement/orders/{oid}',json={'action':'receive'}).status_code,409)
    def test_05_order_cancel(self):
        p=self.get('/api/procurement/reorders')[0]
        d=self.client.post(f"/api/procurement/reorders/approve?item_id={p['item_id']}&supplier_id={p['supplier_id']}&quantity={p['suggested_qty']}&unit_cost={p['unit_cost']}").json()
        self.assertEqual(self.client.patch(f"/api/procurement/orders/{d['po_id']}",json={'action':'cancel'}).status_code,200)
        self.assertIn(p['item_id'],[p['item_id'] for p in self.get('/api/procurement/reorders')])
        self.assertEqual(self.client.post('/api/procurement/reorders/approve?item_id=1&supplier_id=1&quantity=-2&unit_cost=3').status_code,422)
        self.assertEqual(self.client.post('/api/procurement/reorders/approve?item_id=1&supplier_id=1&quantity=2&unit_cost=inf').status_code,422)
    def test_06_beds_dispatch_reassignment_rejection(self):
        hs=self.get('/api/emergency/hospitals'); h1,h2=hs[:2]
        def avail(hid):
            h=next(h for h in self.get('/api/emergency/hospitals') if h['id']==hid)
            return next(b['available_beds'] for b in h['beds'] if b['bed_type']=='Trauma')
        n1,n2=avail(h1['id']),avail(h2['id'])
        r=self.client.post('/api/emergency/dispatches',json={'hospital_id':h1['id'],'patients':2,'bed_type':'Trauma'})
        self.assertEqual(r.status_code,200,r.text);did=r.json()['id']
        self.assertEqual(avail(h1['id']),n1-2)
        self.assertEqual(self.client.patch(f'/api/emergency/dispatches/{did}',json={'action':'reassign','hospital_id':999}).status_code,409)
        self.assertEqual(avail(h1['id']),n1-2) # Failed transfer rolls back released beds.
        r=self.client.patch(f'/api/emergency/dispatches/{did}',json={'action':'reassign','hospital_id':h2['id']})
        self.assertEqual(r.status_code,200,r.text)
        self.assertEqual(avail(h1['id']),n1);self.assertEqual(avail(h2['id']),n2-2)
        self.assertEqual(self.client.patch(f'/api/emergency/dispatches/{did}',json={'action':'reject'}).status_code,200)
        self.assertEqual(avail(h2['id']),n2)
        self.assertEqual(self.client.patch(f'/api/emergency/dispatches/{did}',json={'action':'reject'}).status_code,409)
    def test_07_bed_validation(self):
        h=self.get('/api/emergency/hospitals')[0];b=h['beds'][0]
        p=f"/api/emergency/hospitals/{h['id']}/beds"
        self.assertEqual(self.client.patch(p,json={'bed_type':b['bed_type'],'available_beds':b['total_capacity']+1}).status_code,422)
        self.assertEqual(self.client.patch(p,json={'bed_type':b['bed_type'],'available_beds':-1}).status_code,422)
        self.assertEqual(self.client.patch(p,json={'bed_type':b['bed_type'],'available_beds':5}).status_code,200)
        self.assertEqual(self.client.post('/api/emergency/dispatches',json={'hospital_id':h['id'],'bed_type':b['bed_type'],'patients':6}).status_code,409)
        d=self.client.post('/api/emergency/dispatches',json={'hospital_id':h['id'],'bed_type':b['bed_type'],'patients':1}).json()
        self.assertEqual(self.client.patch(p,json={'bed_type':b['bed_type'],'available_beds':b['total_capacity']}).status_code,422)
        self.assertEqual(self.client.patch(f"/api/emergency/dispatches/{d['id']}",json={'action':'complete'}).status_code,200)
    def test_08_earliest_expiry_dispensing(self):
        before=next(i['current_stock'] for i in self.get('/api/inventory/items') if i['id']==1)
        plan=self.client.post('/api/inventory/fefo-allocate?item_id=1&quantity=2')
        self.assertEqual(plan.status_code,200,plan.text)
        allocations=plan.json()['allocations']
        self.assertTrue(all(a['days_to_expiry'] >= 0 for a in allocations))
        self.assertEqual(self.client.post('/api/inventory/dispense?item_id=1&quantity=2').status_code,200)
        after=next(i['current_stock'] for i in self.get('/api/inventory/items') if i['id']==1)
        self.assertEqual(after,before-2)
        self.assertEqual(self.client.post('/api/inventory/dispense?item_id=1&quantity=1000000').status_code,409)
        self.assertEqual(self.client.post('/api/inventory/fefo-allocate?item_id=1&quantity=-1').status_code,422)
    def test_09_health_bulletin_assistant(self):
        before=len(self.get('/api/nlp/alerts'))
        r=self.client.post('/api/nlp/ingest',json={'headline':'Dengue outbreak in South Zone','content':'Severe dengue surge: platelet drop and dehydration outbreak reported.', 'source_agency':'Test bulletin'})
        self.assertEqual(r.status_code,200,r.text)
        self.assertTrue(r.json()['preparedness_alert_generated'])
        self.assertEqual(len(self.get('/api/nlp/alerts')),before+1)
        for q in ['low stock','bed capacity','expiring batches','purchase orders','dengue outbreak','summary']:
            r=self.client.post('/api/assistant/chat',json={'query':q,'role_context':'Inventory Manager'})
            self.assertEqual(r.status_code,200,r.text);self.assertTrue(r.json()['reply'])
    def test_10b_delivery_estimate_and_role_policy(self):
        from backend.app.services.order_delivery import delivery_estimate
        from backend.app.services.role_access import ADMIN, INVENTORY, PROCUREMENT, allows_event
        from datetime import datetime, timedelta
        from types import SimpleNamespace
        now = datetime(2026, 10, 13, 12)
        order = SimpleNamespace(timestamp=now, supplier_lead_time_days=3)
        self.assertEqual(delivery_estimate(order,now)['days_until_arrival'],3)
        self.assertEqual(delivery_estimate(order,now+timedelta(days=2))['days_until_arrival'],1)
        self.assertEqual(delivery_estimate(order,now+timedelta(days=3))['delivery_status'],'TODAY')
        self.assertEqual(delivery_estimate(order,now+timedelta(days=4))['delivery_status'],'OVERDUE')
        for role, allowed, blocked in [(INVENTORY,'/api/inventory/items','/api/procurement/orders'),(PROCUREMENT,'/api/procurement/orders','/api/inventory/items')]:
            self.assertEqual(self.client.get(allowed,headers={'X-Work-Role':role}).status_code,200)
            self.assertEqual(self.client.get(blocked,headers={'X-Work-Role':role}).status_code,403)
            self.assertEqual(self.client.post('/api/emergency/toggle',headers={'X-Work-Role':role},json={'enable_emergency_mode':True}).status_code,403)
            self.assertEqual(self.client.post('/api/assistant/chat',headers={'X-Work-Role':role},json={'query':'summary'}).status_code,403)
        self.assertEqual(self.client.get('/api/inventory/items',headers={'X-Work-Role':'Unknown'}).status_code,400)
        self.assertTrue(allows_event(INVENTORY,'PO_APPROVED'))
        self.assertFalse(allows_event(PROCUREMENT,'INVENTORY_UPDATE'))
        self.assertFalse(allows_event(INVENTORY,'DISPATCH_UPDATE'))
        p=self.get('/api/procurement/reorders')[0]
        before=next(i['current_stock'] for i in self.get('/api/inventory/items') if i['id']==p['item_id'])
        res=self.client.post(f"/api/procurement/reorders/approve?item_id={p['item_id']}&supplier_id={p['supplier_id']}&quantity={p['suggested_qty']}&unit_cost={p['unit_cost']}",headers={'X-Work-Role':PROCUREMENT})
        self.assertEqual(res.status_code,200,res.text)
        oid=res.json()['po_id']
        item=next(i for i in self.get('/api/inventory/items') if i['id']==p['item_id'])
        self.assertEqual(item['current_stock'],before)
        self.assertEqual(item['incoming_order']['id'],oid)
        self.assertEqual(item['incoming_order']['days_until_arrival'],res.json()['days_until_arrival'])
        self.assertTrue(item['incoming_order']['expected_arrival_at'].endswith('Z'))
        self.assertEqual(self.client.patch(f'/api/procurement/orders/{oid}',headers={'X-Work-Role':INVENTORY},json={'action':'receive'}).status_code,403)
        self.assertEqual(self.client.patch(f'/api/procurement/orders/{oid}',headers={'X-Work-Role':PROCUREMENT},json={'action':'receive'}).status_code,200)
        item=next(i for i in self.get('/api/inventory/items') if i['id']==p['item_id'])
        self.assertEqual(item['current_stock'],before+p['suggested_qty'])
        self.assertIsNone(item['incoming_order'])

    def test_10a_state_restore_and_stock_consistency(self):
        from backend.app.routes.emergency_routes import EMERGENCY_STATE, restore_emergency_state
        import asyncio
        self.client.post('/api/emergency/toggle',json={'enable_emergency_mode':True})
        EMERGENCY_STATE['is_emergency_active']=False
        asyncio.run(restore_emergency_state())
        self.assertTrue(EMERGENCY_STATE['is_emergency_active'])
        self.client.post('/api/emergency/toggle',json={'enable_emergency_mode':False})
        batches=self.get('/api/inventory/batches')
        for item in self.get('/api/inventory/items'):
            self.assertEqual(item['current_stock'],sum(b['remaining_quantity'] for b in batches if b['item_id']==item['id']))

    def test_10_emergency_reserves_and_search(self):
        baseline={p['item_id']:p['safety_stock'] for p in self.get('/api/procurement/reorders')}
        r=self.client.post('/api/emergency/toggle',json={'enable_emergency_mode':True,'surge_multiplier':2.5,'incident_type':'Test','incident_location':'Test'})
        self.assertEqual(r.status_code,200,r.text)
        self.assertTrue(self.get('/api/emergency/status')['is_emergency_active'])
        surge={p['item_id']:p['safety_stock'] for p in self.get('/api/procurement/reorders')}
        self.assertTrue(any(surge[k]>v for k,v in baseline.items() if k in surge))
        self.client.post('/api/emergency/toggle',json={'enable_emergency_mode':False})
        r=self.client.post('/api/emergency/hospital-finder',json={'incident_latitude':28.6139,'incident_longitude':77.209,'required_bed_type':'Trauma','min_available_beds':1,'max_radius_km':100})
        self.assertEqual(r.status_code,200,r.text)
        self.assertTrue(r.json())
        self.assertEqual(self.get('/api/inventory/items?search=no-such-medicine-zzzz'),[])

    def test_11_manual_exact_quantity_receipt_and_validation(self):
        options = self.get('/api/procurement/order-options')
        item = next(o for o in options if not o['has_approved_order'])
        path = '/api/procurement/orders/manual'
        for qty in [0, -1, 1.5, 2147483648, 'bad']:
            self.assertEqual(self.client.post(path, json={'item_id':item['item_id'], 'quantity':qty}).status_code, 422)
        self.assertEqual(self.client.post(path, json={'item_id':999999, 'quantity':7}).status_code,404)
        self.assertEqual(self.client.post(path, headers={'X-Work-Role':'Inventory Manager'}, json={'item_id':item['item_id'], 'quantity':7}).status_code,403)
        result = self.client.post(path, headers={'X-Work-Role':'Procurement Officer'}, json={'item_id':item['item_id'], 'quantity':7})
        self.assertEqual(result.status_code,200,result.text)
        order = result.json()
        self.assertEqual(order['ordered_quantity'],7)
        self.assertEqual(order['total_cost'],round(item['unit_cost']*7,2))
        self.assertEqual(self.client.post(path,json={'item_id':item['item_id'], 'quantity':7}).status_code,409)
        before = next(i['current_stock'] for i in self.get('/api/inventory/items') if i['id']==item['item_id'])
        self.assertEqual(before,item['current_stock'])
        self.assertEqual(self.client.patch(f"/api/procurement/orders/{order['po_id']}",json={'action':'receive'}).status_code,200)
        after = next(i['current_stock'] for i in self.get('/api/inventory/items') if i['id']==item['item_id'])
        self.assertEqual(after,before+7)
        # Manual pricing must use the actual chosen quantity for bulk discounts.
        item = next(o for o in self.get('/api/procurement/order-options') if not o['has_approved_order'] and o['bulk_discount_threshold'])
        qty = item['bulk_discount_threshold']
        order = self.client.post(path,json={'item_id':item['item_id'],'quantity':qty}).json()
        self.assertEqual(order['ordered_quantity'],qty)
        self.assertEqual(order['total_cost'],round(qty*item['discounted_unit_cost'],2))
        self.assertEqual(self.client.patch(f"/api/procurement/orders/{order['po_id']}",json={'action':'cancel'}).status_code,200)

    def test_12_disease_reserve_visible_consistent_reversible(self):
        from backend.app.routes.emergency_routes import EMERGENCY_STATE, restore_emergency_state
        import asyncio, math
        baseline = {i['id']:i for i in self.get('/api/inventory/items')}
        proposals = {r['item_id']:r for r in self.get('/api/procurement/reorders')}
        for disease, expected_words in [('Dengue',['lactate','saline']), ('Influenza / ARI',['azithromycin','amoxicillin','salbutamol','n95']), ('Cholera / Gastroenteritis',['lactate','saline']), ('Trauma / Mass Casualty',[])]:
            result = self.client.post('/api/emergency/toggle',json={'enable_emergency_mode':True,'reserve_disease':disease,'surge_multiplier':2.5})
            self.assertEqual(result.status_code,200,result.text)
            status = result.json()
            self.assertEqual(status['reserve_disease'],disease)
            affected = {i['item_id'] for i in status['critical_trauma_items']}
            self.assertTrue(affected)
            if expected_words:
                self.assertEqual(affected,{i['id'] for i in baseline.values() if any(w in i['name'].lower() for w in expected_words)})
            items = self.get('/api/inventory/items')
            for item in items:
                base = baseline[item['id']]['safety_stock_threshold']
                expected = math.ceil(base*2.5) if item['id'] in affected else base
                self.assertEqual(item['safety_stock_threshold'],expected)
                self.assertEqual(item['baseline_safety_stock_threshold'],base)
                self.assertEqual(item['current_stock'],baseline[item['id']]['current_stock'])
            summary = self.get('/api/inventory/summary')
            self.assertEqual(summary['critical_low_count'],sum(0 < i['current_stock'] < i['safety_stock_threshold'] for i in items))
            for r in self.get('/api/procurement/reorders'):
                if r['item_id'] in proposals:
                    old = proposals[r['item_id']]
                    if r['item_id'] in affected:
                        self.assertGreater(r['safety_stock'],old['safety_stock'])
                        self.assertGreater(r['reorder_point'],old['reorder_point'])
                    else:
                        self.assertEqual(r['safety_stock'],old['safety_stock'])
            EMERGENCY_STATE['reserve_disease']='Trauma / Mass Casualty'
            asyncio.run(restore_emergency_state())
            self.assertEqual(EMERGENCY_STATE['reserve_disease'],disease)
            self.client.post('/api/emergency/toggle',json={'enable_emergency_mode':False})
            for item in self.get('/api/inventory/items'):
                self.assertEqual(item['safety_stock_threshold'],baseline[item['id']]['safety_stock_threshold'])
        self.assertEqual(self.client.post('/api/emergency/toggle',json={'enable_emergency_mode':True,'reserve_disease':'Unknown'}).status_code,422)

if __name__=='__main__':unittest.main(verbosity=2)
