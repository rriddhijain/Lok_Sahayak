# Lok Sahayak: Complete Step-by-Step Live Demo Script

> **How to use this script:**
> Practice this once or twice while looking at `http://localhost:3000`.
> - **[ACTION]**: The exact mouse click or typing action to perform on screen.
> - **[SAY THIS]**: The exact words to speak to your teacher.
> - **[UNDER THE HOOD]**: What backend code, database transaction, or algorithm is running (in case the teacher interrupts or asks "how does that work?").

---

## Pre-Demo Checklist (1 Minute Before Presenting)
1. Ensure both services are running:
   - Backend: `http://localhost:8000/docs` (FastAPI)
   - Frontend: `http://localhost:3000` (Next.js)
2. Open `http://localhost:3000` in Google Chrome / Brave / Safari.
3. Verify the top right displays: `🟢 Live Connected`.
4. Maximize the browser window for the best presentation layout.

---

## STEP 1: Introduction & System Overview (Time: 0:00 – 1:00)

#### [ACTION]
* Keep the screen on the main **Overview (Command Center)** page.
* Point your cursor to the top KPI cards: *Active Formulary Items*, *Critical Stockout Alerts*, *Regional ICU / Trauma Beds*, and *Public Health Alerts*.

#### [SAY THIS]
> *"Good morning / afternoon Professor. Today we are presenting **Lok Sahayak**, a Smart Hospital Inventory and Clinical Decision-Support platform.
>
> In many public and district health centers, inventory management is still handled through manual ledgers or basic spreadsheets. This leads to three severe clinical failures:
> 1. Life-saving medicines running out unexpectedly during trauma emergencies.
> 2. High-cost drugs quietly expiring at the back of shelves due to poor batch rotation.
> 3. Regional hospital beds filling up during epidemic outbreaks without spatial coordination.
>
> Lok Sahayak solves this by connecting a Next.js clinical dashboard to an asynchronous FastAPI backend and relational database. Every button you see on this screen executes real mathematical models and database transactions, backed by live Server-Sent Events."*

#### [UNDER THE HOOD]
* The KPI cards are loaded via `GET /api/inventory/items`, `GET /api/emergency/hospitals`, and `GET /api/alerts/active`.
* The `🟢 Live Connected` badge indicates an open `EventSource` connection to `GET /api/stream/events`.

---

## STEP 2: Role-Based Workflow Perspectives (Time: 1:00 – 1:45)

#### [ACTION]
* Move your cursor to the **Active Perspective** dropdown in the top-left sidebar (or the header perspective banner).
* Click the dropdown and switch from **Hospital Administrator** $\rightarrow$ **Inventory Manager**.
* Point out how the view updates to focus on stock levels, batch expiries, and storage requirements.
* Switch to **Procurement Officer**.
* Point out how the view shifts focus to supplier lead times, reorder quantities, and restock approvals.
* Switch back to **Hospital Administrator** for the rest of the demo.

#### [SAY THIS]
> *"Hospitals have different staff roles with distinct operational responsibilities. We designed role-tailored perspectives:
> - The **Inventory Manager** needs immediate visibility into expiring batches, safety stock thresholds, and cold-chain storage.
> - The **Procurement Officer** focuses on purchasing budgets, lead times, and optimal restock orders.
> - The **Hospital Administrator** oversees regional trauma capacity, patient transfers, and outbreak containment.
>
> Switching perspectives instantly prioritizes the relevant clinical actions without cluttering the interface."*

#### [TEACHER INTERRUPT DEFENSE]
* *Teacher asks: "Is this real authentication?"*
* *Your answer:* "In this live demonstration, we provide instant role switching so you can inspect all three workflows without logging out. In production, this maps to JWT role-based access control (RBAC)."

---

## STEP 3: Real-Time Global Search & Cold Storage Badging (Time: 1:45 – 2:30)

#### [ACTION]
* Click the **"Medicine Inventory"** tab in the sidebar.
* In the global search bar at the very top, type: `Amoxicillin`.
* Point out that the inventory table immediately filters down to Amoxicillin with zero page lag.
* Clear the search bar or type `Insulin`.
* Point your cursor to the bold badge: `❄️ Cold Storage: 2°C – 8°C`.
* Clear the search bar using the `✕` button so all medicines reappear.

#### [SAY THIS]
> *"Here is our core Medicine Inventory Matrix.
> Notice our global real-time search: as soon as we search for a drug by name, SKU, or category, the inventory table filters instantly.
>
> Next, notice our clear clinical indicators. Certain medicines like Insulin and biological vaccines require strict cold-chain compliance. We display a prominent `❄️ Cold Storage: 2°C – 8°C` badge to prevent storage violations by pharmacy staff.
>
> Every item also features a real-time **Composite Risk Score** out of 100, which algorithmically scores stockout probability, expiry risk, and supplier lead times."*

#### [UNDER THE HOOD]
* The table renders from the `Item` model with relational joins to `Batch`.
* Temperature values are stored in `item.storage_temperature_str` as manufacturer-mandated storage protocols.

---

## STEP 4: First-Expired, First-Out (FEFO) Dispensing (Time: 2:30 – 3:30)

#### [ACTION]
* Click on any medicine row (e.g., **Amoxicillin 500mg** or **Paracetamol 500mg**) to expand its batch details.
* Point to the batch list showing **Batch Number**, **Quantity**, and **Expiry Date**.
* Click the **"Dispense Stock"** button (or open the FEFO dispensing modal).
* Enter a small test quantity: `10`.
* Point out the preview: *"Notice how the system automatically selects the batch expiring earliest."*
* Click **"Confirm Dispense"**.
* Point out the green success notification, the updated batch quantity, and the updated total stock.

#### [SAY THIS]
> *"One of the largest financial drains on public hospitals is drug expiration. Standard inventory systems allow staff to pull any box off the shelf, often leaving older batches behind until they expire.
>
> Lok Sahayak implements an automated **First-Expired, First-Out (FEFO)** algorithm.
> When a nurse or pharmacist dispenses 10 units, the system automatically checks every unexpired batch in the database, sorts them by expiry date, and draws from the batch expiring soonest.
>
> Notice that the stock immediately updated from 450 to 440. Under the hood, this was committed as an atomic database transaction. If the requested quantity exceeded available unexpired stock, the backend would roll back entirely, guaranteeing no negative stock or expired dispensing."*

#### [UNDER THE HOOD]
* Endpoint: `POST /api/inventory/items/{id}/dispense`.
* Runs `RiskAndExpiryEngine.calculate_expiry_risk`.
* Deducts `batch.remaining_quantity` and `item.current_stock`.
* Inserts a row into `StockTransaction(type="DISPENSE")`.
* Commits via `await db.commit()` in SQLAlchemy.

---

## STEP 5: AI Demand Forecasting & Horizon Selection (Time: 3:30 – 4:30)

#### [ACTION]
* Click **"Demand Predictions"** in the sidebar.
* Select **Amoxicillin 500mg** (or keep the default selected item).
* Point your cursor to the interactive Recharts graph showing historical consumption (blue) and future forecast (green dashed line with shaded confidence envelope).
* Click the **"14 Days"** horizon button $\rightarrow$ Point out that the curve zooms to a 14-day projection.
* Click the **"60 Days"** horizon button $\rightarrow$ Point out that the trajectory expands to 60 days.
* Point to the metrics cards above the chart:
  * **Average Prediction Margin (MAE)**
  * **Model Match Rate ($R^2$ Score: ~91%)**
  * **Projected Stockout Date**

#### [SAY THIS]
> *"Now let's examine our predictive machine learning engine.
> Under the **Demand Predictions** tab, we forecast future consumption for every medicine.
>
> Unlike basic moving averages, our backend trains a **Scikit-Learn Ridge Regression** model. It performs feature engineering on historical usage, capturing day-of-week seasonality (such as weekend trauma surges) and autoregressive lag trends at $t-1$, $t-7$, and $t-14$.
>
> Notice these horizon controls: when I click **14 Days**, **30 Days**, or **60 Days**, the backend dynamically recalculates the projection envelope with a $95\%$ statistical confidence interval.
>
> The model also calculates our exact projected stockout date based on cumulative burn rate, warning us weeks before a shortage occurs."*

#### [TEACHER INTERRUPT DEFENSE]
* *Teacher asks: "Why Ridge Regression instead of LSTM or Neural Networks?"*
* *Your answer:* "Hospital consumption data at an individual facility typically spans a few months. Deep learning models like LSTMs overfit heavily and require massive data. Ridge Regression incorporates an $L_2$ regularization penalty that prevents overfitting, executes in under 5 milliseconds, and provides fully explainable metrics like MAE and $R^2$."

---

## STEP 6: Dynamic Procurement & 1-Click Purchase Order Approval (Time: 4:30 – 5:30)

#### [ACTION]
* Click **"Orders & Restock"** in the sidebar.
* Point to the pending reorder card (e.g., *Amoxicillin 500mg* or *Normal Saline*).
* Point out:
  * **Recommended Restock Quantity (EOQ)**
  * **Optimal Supplier** (ranked with reliability & lead time)
  * **Total Estimated Cost**
* Click the green button: **"Approve & Restock"** (or "Approve Order").
* Watch the instant transition:
  * A green success banner appears.
  * The pending deficit card clears.
  * Click on the **"Approved Orders"** tab to show that the purchase order is now logged in the permanent audit record.

#### [SAY THIS]
> *"When the forecasting engine detects that an item will breach its safety threshold, it hands off to our Intelligent Procurement engine.
>
> The restock quantity is not a random guess—it is calculated using the **Economic Order Quantity (EOQ)** formula:
> $$\text{EOQ} = \sqrt{\frac{2 \cdot \text{Annual Demand} \cdot \text{Order Cost}}{\text{Holding Cost}}}$$
> This mathematically minimizes both our ordering overhead and warehouse storage holding costs.
>
> Furthermore, our **Supplier Intelligence** algorithm evaluates vendor reliability ($40\%$), on-time delivery rate ($30\%$), and lead time ($20\%$) to automatically select the optimal supplier.
>
> When the Procurement Officer clicks **Approve & Restock**, the backend records the purchase order, increments the inventory, logs a `RECEIPT` transaction, and broadcasts an SSE live event across the hospital network."*

#### [UNDER THE HOOD]
* Endpoint: `POST /api/procurement/reorders/approve`.
* Evaluated by `ReorderOptimizer.evaluate_item_reorder`.
* Sets `item.current_stock += quantity`, logs `StockTransaction(type="RECEIPT")`.
* Broadcasts `INVENTORY_UPDATE` via `sse_broadcaster`.

---

## STEP 7: Emergency Hospital Radar & Bed Management (Time: 5:30 – 6:30)

#### [ACTION]
* Click **"Emergency & Beds"** in the sidebar.
* Point to the **Spatial Network Radar** on the left.
* Point to the hospital cards on the right: *Apex Trauma Center*, *Metro General*, *District Care Hospital*.
* Point out the **Distance (km)** and **Estimated Ambulance Travel Time (min)**.
* In the Destination Hospital dropdown, select a different hospital (e.g. *Metro General Hospital*).
* Look at the incoming patient transfer card:
  * Click **"Accept & Admit"** $\rightarrow$ Show available beds decrementing immediately.
  * Point to the **"Reject / Divert"** button and explain how transfers can be safely diverted if a facility is at surge capacity.
* Point to the **"+ Admit"** and **"− Discharge"** buttons on the bed counters and click `+ Admit` to show live bed capacity tracking.

#### [SAY THIS]
> *"During mass casualty incidents—such as a highway collision or natural disaster—paramedics need to know where to route patients immediately.
>
> Our **Spatial Emergency Engine** computes great-circle distances between GPS coordinates using the **Haversine Formula**:
> $$d = 2R \cdot \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta \text{lat}}{2}\right) + \cos(\text{lat}_1)\cos(\text{lat}_2)\sin^2\left(\frac{\Delta \text{lon}}{2}\right)}\right)$$
>
> It dynamically ranks regional facilities by proximity, travel time, and real-time ICU and Trauma bed availability.
>
> Paramedics and hospital coordinators can dispatch patient transfers with 1 click. Clicking **Accept & Admit** atomically locks and reserves the bed at the destination hospital. If a ward becomes overwhelmed, staff can click **Reject / Divert** to re-route the ambulance, preventing dangerous delays at hospital intake."*

#### [UNDER THE HOOD]
* Code: [`backend/app/services/spatial_emergency.py`](file:///Users/riddhijain/Desktop/Lok_Sahayak/backend/app/services/spatial_emergency.py) & [`backend/app/routes/emergency_routes.py`](file:///Users/riddhijain/Desktop/Lok_Sahayak/backend/app/routes/emergency_routes.py).
* Dispatches update `BedAllocation.occupied_beds += count` and `BedAllocation.available_beds -= count`.
* Haversine calculations use $R = 6371$ km.

---

## STEP 8: Public Health Outbreak Bulletin & Surge Multiplier (Time: 6:30 – 7:15)

#### [ACTION]
* In the top header, click the **"+ Add Outbreak Alert"** button (or open the Public Health modal).
* Select a preset or type a quick bulletin: *"Cluster of Dengue cases with severe thrombocytopenia in North Ward"*.
* Click **"Ingest & Analyze Bulletin"**.
* Show the result:
  * Disease detected: **Dengue**.
  * Affected categories: **IV Fluids & Platelet Kits**.
  * Surge Multiplier: **2.2× Demand Buffer applied**.
* Close the modal and toggle the **Emergency Surge Mode** switch in the top header. Show the yellow/amber surge banner indicating that safety stock buffers are expanded.

#### [SAY THIS]
> *"Hospital inventory cannot operate in a vacuum—it must respond to public health outbreaks before patients flood the ER.
>
> We built a **Public Health NLP Pipeline** backed by vector embeddings. When a disease bulletin is ingested, the system generates a 128-dimensional dense vector and queries our **Milvus Vector Database** using cosine similarity.
>
> It matches the outbreak against our disease taxonomy. For Dengue, it immediately flags IV Fluids and Platelet Kits and applies a **2.2× Surge Multiplier** to our reorder thresholds.
>
> This gives hospital leadership automated lead-time to restock essential supplies days before peak epidemic admissions."*

---

## STEP 9: Grounded AI Decision-Support Assistant (Time: 7:15 – 8:00)

#### [ACTION]
* Click the floating **"AI Assistant"** button in the bottom-right corner to slide out the drawer.
* Click one of the quick question chips, or type:
  `Which medicines are running low on stock?`
* Hit Enter / Send.
* Point out:
  * The natural language explanation.
  * The **Audit Citations** containing exact SKU codes, stock counts, and batch numbers.
  * The **Suggested Next Steps** (e.g., *"Generate Expedited Purchase Orders"*).

#### [SAY THIS]
> *"Finally, we integrated a conversational clinical assistant powered by Google Gemini and Retrieval-Augmented Generation (RAG).
>
> Healthcare staff cannot trust generic AI that hallucinates fictional drugs.
> When a doctor or administrator asks a question, our backend first takes a live snapshot of our SQLite database: stock levels, batch expirations, ICU occupancy, and active alerts.
>
> It grounds the AI's response entirely within these verified facts and provides **clickable audit citations** linking directly to the database records. It gives staff immediate answers without forcing them to manually search across multiple tables."*

#### [UNDER THE HOOD]
* Code: [`backend/app/services/antigravity_agent.py`](file:///Users/riddhijain/Desktop/Lok_Sahayak/backend/app/services/antigravity_agent.py) & [`backend/app/routes/assistant_routes.py`](file:///Users/riddhijain/Desktop/Lok_Sahayak/backend/app/routes/assistant_routes.py).
* Ingests live database rows from `Item`, `Batch`, `Hospital`, and `ReorderRecommendation` into the context window.
* Generates structured citations (`entity_type`, `entity_id`, `metric`).

---

## STEP 10: Conclusion & Summary (Time: 8:00 – 8:30)

#### [SAY THIS]
> *"To summarize, Lok Sahayak unites six mission-critical hospital capabilities into one seamless, responsive platform:
> 1. **Relational FEFO Inventory Tracking** to eliminate expiration waste.
> 2. **Scikit-Learn Time-Series Machine Learning** for proactive demand forecasting.
> 3. **Dynamic EOQ and Multi-Criteria Supplier Selection** for cost-efficient restock.
> 4. **Spatial Haversine Emergency Coordination** for regional bed management.
> 5. **Vector-based Public Health NLP** for outbreak early-warning preparedness.
> 6. **Grounded AI Decision Support** for instant clinical audit queries.
>
> All backend workflows are fully validated with automated test suites, and the system is ready for demonstration.
>
> Thank you, Professor! We are now open for your questions."*

---

## Top 5 Questions the Teacher Might Ask & How to Answer

| Teacher Question | Your Winning Answer |
|---|---|
| **1. "Where is the data stored?"** | "Locally, it is stored in a relational SQLite database (`hospital_inventory.db`) managed via SQLAlchemy 2.0 ORM. Because we used async SQLAlchemy models, switching to production PostgreSQL in Docker requires changing only a single connection string in our config, with zero code rewrites." |
| **2. "How does the live update work without refreshing?"** | "We use Server-Sent Events (SSE). The backend exposes a streaming endpoint `/api/stream/events`. The frontend maintains an open `EventSource` connection. Whenever an order is approved, stock is dispensed, or a bed is reserved, the backend broadcaster pushes an event over standard HTTP port 8000, and React immediately re-fetches the updated data." |
| **3. "What happens if two users dispense medicine at the exact same millisecond?"** | "We prevent race conditions using ACID database transactions. In `inventory_routes.py`, the batch deduction and total stock deduction are committed inside a single `db.commit()`. If the requested quantity exceeds the remaining stock, the transaction immediately raises an HTTP 400 error and rolls back completely." |
| **4. "Why did you use Ridge Regression instead of a standard linear regression or polynomial?"** | "Standard linear regression suffers from multicollinearity when using multiple lag features ($t-1, t-7, t-14$) and seasonality flags. Ridge Regression introduces an $L_2$ regularization penalty ($\lambda \sum w_i^2$) that shrinks redundant weights, preventing overfitting and giving stable forecasts even when hospital historical data is limited." |
| **5. "Can your AI Assistant fabricate or hallucinate medicine numbers?"** | "No. We implement strict Retrieval-Augmented Generation (RAG). Before the query is processed, the backend injects the live SQL snapshot into the prompt context. The system is instructed to cite only real items, batches, and hospitals present in that snapshot, and returns verifiable entity IDs for every statement." |
