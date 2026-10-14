# Lok Sahayak: 4-Member Project Division & Presentation Guide

> **How to use this guide:**
> Each team member takes **one section** below. When presenting, speak in the **first person** (*"I designed and built..."*, *"My module handles..."*).
> Each section provides:
> 1. **Role & Modules Owned** (The exact files you can say you coded)
> 2. **Technical Explanation** (How your code works under the hood)
> 3. **Spoken Presentation Script** (Word-for-word dialogue + demo action)
> 4. **Teacher Q&A Defense** (The exact questions the teacher will ask YOU, with winning answers)

---

```
                              ┌─────────────────────────────────────────┐
                              │               LOK SAHAYAK               │
                              └────────────────────┬────────────────────┘
                                                   │
         ┌─────────────────────┬───────────────────┴───────────────────┬─────────────────────┐
         ▼                     ▼                                       ▼                     ▼
   MEMBER 1              MEMBER 2                                MEMBER 3              MEMBER 4
Frontend Architecture  Backend & Database                      ML Forecasting &      Spatial Emergency,
 & Client Gateway       & FEFO Inventory Engine                 Procurement AI        Real-Time SSE & AI Agent
 (Next.js 15, State,    (FastAPI, SQLAlchemy,                   (Ridge Regression,    (Haversine Radar, Beds,
  Roles, Search)         Batches, Risk Formula)                  EOQ, Milvus NLP)      SSE Stream, RAG Agent)
```

---

# MEMBER 1: Frontend Architecture, Role Perspectives & Client Data Gateway

### 1.1 Role & Files You Own
* **Your Title:** Lead Frontend Engineer & UX Architect
* **Files You Built / Modified:**
  * `frontend/src/app/page.tsx` (Global layout & state orchestrator)
  * `frontend/src/app/layout.tsx` & `globals.css` (Clinical Modern design tokens & root layout)
  * `frontend/src/lib/api.ts` (**Client Data Gateway & Schema Normalization**)
  * `frontend/src/components/Sidebar.tsx` (Navigation & role switcher)
  * `frontend/src/components/TopHeader.tsx` (Global search bar, emergency surge toggle, stream connection indicator)
  * `frontend/src/components/CommandCenterView.tsx` (Executive overview dashboard)

---

### 1.2 Technical Explanation (What You Did Under the Hood)
1. **Next.js 15 & React 19 Architecture:**
   * Built a single-page application using Next.js 15 App Router.
   * Managed global application state in `page.tsx` using native React hooks (`useState`, `useEffect`, `useCallback`) to track active tabs, role perspectives, global search queries, and selected medicines without unnecessary external state library bloat.
2. **The Client Data Gateway (`frontend/src/lib/api.ts`):**
   * *Critical Contribution:* The Python backend uses `snake_case` (e.g. `item_code`, `current_stock`, `remaining_quantity`), while TypeScript components expect `camelCase` and strictly typed interfaces.
   * I wrote `api.ts` as an abstraction layer that fetches from `/api`, validates HTTP status codes, maps database models into UI schemas, and provides safe fallbacks so the dashboard never crashes on missing attributes.
3. **Role-Based Workflow Perspectives:**
   * Implemented role switching for three distinct hospital personas:
     * **Hospital Administrator:** High-level executive overview, regional bed occupancy, and outbreak alerts.
     * **Inventory Manager:** Direct focus on batch expiries, cold storage temperatures, and dispensing.
     * **Procurement Officer:** Focus on purchase orders, supplier lead times, and restock approvals.
4. **Global Real-Time Search:**
   * Built an instant-filtering search bar in `TopHeader.tsx` that binds to the inventory matrix, allowing staff to find drugs by brand name, generic chemical name, SKU code, or batch number with zero latency.

---

### 1.3 Your Spoken Presentation Script

#### [ACTION]
* Screen starts on `http://localhost:3000` on the **Overview** page.
* Point to the top KPIs and the `🟢 Live Connected` badge.
* Switch the **Active Perspective** dropdown: Administrator $\rightarrow$ Inventory Manager $\rightarrow$ Procurement Officer $\rightarrow$ Administrator.
* Type `Amoxicillin` into the top search bar to show instant filtering, then clear it.

#### [SAY THIS]
> *"Good morning Professor. I am [Your Name], and I was responsible for the **Frontend Architecture, UI/UX Design, and Client Data Integration**.
>
> When designing Lok Sahayak, our goal was to build a clean, clinical-grade interface that eliminates cognitive overload for hospital staff. We built the frontend using **Next.js 15, React 19, and Tailwind CSS**.
>
> In `page.tsx`, I built our state management orchestrator. One key architectural feature I implemented is **Role-Based Workflow Perspectives**. Different hospital personnel have different priorities:
> - When I switch to **Inventory Manager**, the interface prioritizes near-expiry batches and storage temperature requirements.
> - Switching to **Procurement Officer** focuses on supplier lead times and pending purchase orders.
> - The **Hospital Administrator** view provides high-level bed availability and outbreak metrics.
>
> Under the hood, I authored `api.ts`, which serves as our **Data Normalization Gateway**. It bridges our asynchronous Python backend with our TypeScript components, ensuring that field mappings—like batch counts, historical consumption, and forecast curves—render seamlessly without client-side type errors.
>
> I will now hand over to **[Member 2's Name]**, who engineered our backend database and core inventory dispensing engine."*

---

### 1.4 Teacher Defense Questions for Member 1
* **Q1: "Why did you use Next.js instead of plain Vite + React?"**
  * *Answer:* "Next.js 15 provides an enterprise App Router with optimized production bundling, fast server compilation, and strict TypeScript integration. It also provides built-in proxying capabilities that let us communicate with our FastAPI backend over a clean `/api` route without CORS issues in production."
* **Q2: "How does your global search work? Is it an API call on every keystroke?"**
  * *Answer:* "I implemented client-side state filtering in `TopHeader.tsx` and `InventoryMatrix.tsx`. Because the formulary catalog is fetched and cached in React state, filtering operates instantaneously in memory across names, categories, and batch numbers without overwhelming the backend with unnecessary HTTP requests."

---

# MEMBER 2: Backend Architecture, Relational Database & FEFO Inventory Engine

### 2.1 Role & Files You Own
* **Your Title:** Backend & Database Systems Engineer
* **Files You Built / Modified:**
  * `backend/main.py` (FastAPI initialization & middleware)
  * `backend/app/database.py` (SQLAlchemy 2.0 async engine & session maker)
  * `backend/app/models/inventory.py` & `models/transactions.py` (Database schema definitions)
  * `backend/app/routes/inventory_routes.py` (Inventory endpoints & atomic dispensing)
  * `backend/app/schemas/inventory_schemas.py` (Pydantic request/response validation)
  * `backend/app/services/risk_expiry.py` (**FEFO Algorithm & Composite Risk Score**)
  * `frontend/src/components/InventoryMatrix.tsx` & `FEFOModal.tsx` (Inventory table & batch drawer)

---

### 2.2 Technical Explanation (What You Did Under the Hood)
1. **Relational Database Design (SQLAlchemy 2.0 ORM):**
   * Designed the relational schema in SQLite / PostgreSQL.
   * Key relationship: `Item` (1) to `Batch` (many). An item like *Amoxicillin 500mg* has a single SKU and total stock, but belongs to multiple physical production batches with distinct expiration dates and lot numbers.
   * Built `StockTransaction` as an immutable append-only ledger tracking every stock addition (`RECEIPT`) and deduction (`DISPENSE`).
2. **First-Expired, First-Out (FEFO) Engine:**
   * Implemented the FEFO algorithm in `risk_expiry.py`:
     1. Automatically quarantines and excludes expired batches (`expiry_date <= today`).
     2. Sorts unexpired batches in ascending order by expiration date.
     3. Deducts the requested quantity sequentially across the earliest-expiring lots.
3. **Database Transaction Atomicity (ACID Guarantees):**
   * Dispensing updates both `batch.remaining_quantity` and aggregate `item.current_stock` inside a single `async with db.begin():` transaction.
   * If stock is insufficient or a batch is locked, the backend triggers an automatic `rollback`, preventing race conditions or negative stock.
4. **Composite Clinical Risk Score Formula:**
   * Implemented a multi-factor risk score ($0$ to $100$) in `compute_composite_risk_score`:
     $$\text{Risk Score} = 0.45 \cdot \text{StockoutRisk} + 0.35 \cdot \text{ExpiryRisk} + 0.20 \cdot \text{SupplierRisk}$$
   * For trauma-critical medications (e.g., Morphine, Blood Bags), the stockout weight increases to $0.50$.
5. **Storage Temperature Protocols:**
   * Created clear cold-chain storage indicators (`❄️ Cold Storage: 2°C – 8°C`) in `InventoryMatrix.tsx` to display regulatory pharmaceutical storage instructions.

---

### 2.3 Your Spoken Presentation Script

#### [ACTION]
* Click **"Medicine Inventory"** in the sidebar.
* Click on a medicine row (e.g. **Amoxicillin 500mg**) to expand its batch details.
* Point to the batches: show Batch Number, Remaining Units, and Expiry Dates.
* Click **"Dispense Stock"**, enter quantity `10`, and point out the FEFO batch allocation.
* Click **"Confirm Dispense"** $\rightarrow$ Show the updated stock count (e.g. 450 $\rightarrow$ 440) and success toast.

#### [SAY THIS]
> *"Thank you, [Member 1]. I am [Your Name], and I designed and built the **Backend Systems, Relational Database, and Core FEFO Inventory Engine**.
>
> In healthcare logistics, you cannot simply store 'total quantity.' A hospital might have 500 vials of an antibiotic, but if 200 of them expire next week, dispensing from the wrong box results in expired medication waste or clinical failure.
>
> In `models/inventory.py`, I structured our database using **SQLAlchemy 2.0**:
> - We separate the abstract medicine catalog (`Item`) from physical production lots (`Batch`).
> - Every stock movement is logged in an append-only `StockTransaction` table for audit compliance.
>
> In `risk_expiry.py`, I implemented our **First-Expired, First-Out (FEFO)** dispensing engine. When a nurse requests 10 units, the algorithm automatically excludes expired batches, identifies the batch expiring soonest, and allocates units from it.
>
> Crucially, this operation is **atomic**. Both the batch deduction and the aggregate stock update occur within a single database transaction. If the requested quantity exceeds available stock, the entire operation is rolled back, guaranteeing zero data corruption.
>
> I also engineered our **Composite Risk Score**, which algorithmically calculates stockout probability, expiration decay, and supplier lead times on a 0 to 100 scale.
>
> I will now pass the presentation to **[Member 3's Name]**, who built our machine learning forecasting, dynamic procurement, and public health intelligence."*

---

### 2.4 Teacher Defense Questions for Member 2
* **Q1: "How do you prevent negative inventory if two users dispense at the same time?"**
  * *Answer:* "We use ACID transactions in SQLAlchemy. In `inventory_routes.py`, we query the item and its active batches within an async database session. Before deducting, we validate `total_available >= requested_qty`. If another request reduced the stock concurrently, the validation raises an HTTP 400 error and rolls back the session, ensuring stock can never drop below zero."
* **Q2: "Why use SQLite instead of PostgreSQL?"**
  * *Answer:* "SQLite is our lightweight, zero-configuration local database engine. However, because I architected the backend using asynchronous SQLAlchemy ORM models, switching to production PostgreSQL simply requires updating the `DATABASE_URL` connection string in `.env` or `docker-compose.yml`—the business logic remains completely unchanged."

---

# MEMBER 3: Machine Learning Forecasting, Dynamic EOQ & Public Health NLP

### 3.1 Role & Files You Own
* **Your Title:** Machine Learning & Intelligent Procurement Engineer
* **Files You Built / Modified:**
  * `backend/app/services/ml_forecasting.py` (**Scikit-Learn Ridge Regression Engine**)
  * `backend/app/services/reorder_optimizer.py` (**Dynamic EOQ & Supplier Utility Engine**)
  * `backend/app/services/public_health_nlp.py` (**Milvus Vector NLP & Outbreak Surge Engine**)
  * `backend/app/services/anomaly_detection.py` (Statistical Z-Score & IQR Outlier Engine)
  * `backend/app/routes/forecast_routes.py`, `optimization_routes.py`, `nlp_routes.py`
  * `frontend/src/components/ForecastingView.tsx`, `ProcurementView.tsx`, `PublicHealthModal.tsx`

---

### 3.2 Technical Explanation (What You Did Under the Hood)
1. **Time-Series Demand Forecasting with Ridge Regression:**
   * Used **Scikit-Learn Ridge Regression** (`sklearn.linear_model.Ridge`) with $L_2$ regularization.
   * **Feature Engineering:** Extracted day-of-week seasonality (capturing hospital weekend emergency spikes), time-trend drift, and autoregressive lag variables ($t-1, t-7, t-14$).
   * Evaluated model accuracy on holdout data using **Mean Absolute Error (MAE)**, **Root Mean Squared Error (RMSE)**, and **$R^2$ Score** (~$91\%$ fit).
   * Computed dynamic $95\%$ confidence bounds ($\pm 1.96 \cdot \sigma$) and the exact projected stockout date based on cumulative predicted burn rate.
2. **Interactive Horizon Projections:**
   * Built dynamic horizon selection in `ForecastingView.tsx` allowing staff to project **14 Days**, **30 Days**, or **60 Days** into the future.
3. **Dynamic Economic Order Quantity (EOQ):**
   * Implemented the classic inventory optimization formula:
     $$\text{EOQ} = \sqrt{\frac{2 \cdot D \cdot K}{h \cdot C}}$$
     *(where $D = \text{annual demand}$, $K = \$45\text{ order cost}$, $h = 22\%\text{ holding cost}$, $C = \text{unit cost})$*.
4. **Multi-Criteria Supplier Selection Algorithm:**
   * Formulated a weighted utility score to pick the best supplier:
     $$\text{Utility} = 0.40 \cdot \text{Reliability} + 0.30 \cdot \text{OnTimeRate} + 0.20 \cdot \text{LeadTimeNorm} + 0.10 \cdot \text{PriceCompetitiveness}$$
5. **Public Health NLP & Milvus Vector Database:**
   * Ingests disease surveillance bulletins, generates 128-dimensional dense vectors, and queries the **Milvus Vector Database** using Cosine similarity.
   * Matches outbreaks (e.g. Dengue, Cholera) to internal medicine categories and applies an automated **2.2× to 2.5× Epidemic Surge Multiplier**.

---

### 3.3 Your Spoken Presentation Script

#### [ACTION]
* Click **"Demand Predictions"** in the sidebar.
* Point out the Recharts graph showing historical usage vs projected demand.
* Click the **14 Days**, **30 Days**, and **60 Days** horizon buttons to show the curve dynamically adjusting.
* Click **"Orders & Restock"** in the sidebar.
* Point out the **Recommended Restock Quantity (EOQ)** and **Optimal Supplier**.
* Click **"Approve & Restock"** $\rightarrow$ Show the green approval banner and the order moving into the **Approved Orders** tab.

#### [SAY THIS]
> *"Thank you, [Member 2]. I am [Your Name], and I engineered the **Machine Learning Forecasting, Dynamic Procurement, and Public Health Intelligence engines**.
>
> Hospital demand is notoriously volatile. To prevent sudden stockouts, I built a predictive time-series model in `ml_forecasting.py` using **Scikit-Learn Ridge Regression**.
>
> We chose Ridge Regression because hospital consumption data at an individual facility typically spans a few months. Deep learning models like LSTMs overfit heavily on short time-series data. Ridge regression incorporates an $L_2$ regularization penalty that prevents overfitting while capturing day-of-week seasonality and autoregressive lag trends at $t-1$, $t-7$, and $t-14$.
>
> As you can see on screen, staff can switch between **14-day, 30-day, and 60-day horizons**. The model calculates real-time accuracy metrics—including Mean Absolute Error (MAE) and $R^2$ score—and predicts the exact date when stock will run out.
>
> When an item hits its reorder point, my **Intelligent Procurement engine** takes over. Rather than guessing an order size, it calculates the **Economic Order Quantity (EOQ)**:
> $$\text{EOQ} = \sqrt{\frac{2DK}{hC}}$$
> This mathematically balances purchase dispatch costs with inventory holding costs. We also run a **Multi-Criteria Supplier Utility algorithm** that ranks vendors on reliability, lead time, and price.
>
> When I click **Approve & Restock**, the backend records the purchase order, increments the inventory, and logs a receipt transaction.
>
> I also integrated a **Public Health NLP pipeline** backed by vector embeddings in **Milvus**. When disease bulletins are reported—like a Dengue outbreak—the system automatically applies a 2.2× surge buffer to our safety stock.
>
> I will now hand over to **[Member 4's Name]**, who built our spatial emergency response, real-time live events, and grounded AI assistant."*

---

### 3.4 Teacher Defense Questions for Member 3
* **Q1: "Is $R^2$ an accuracy percentage?"**
  * *Answer:* "No, $R^2$ is the coefficient of determination. It measures the proportion of variance in consumption that is explained by our feature variables (trend, seasonality, and lags) relative to a simple mean baseline. An $R^2$ of 0.91 indicates that 91% of demand fluctuations are accounted for by our model."
* **Q2: "What is the difference between ROP and EOQ in your code?"**
  * *Answer:* "ROP (Reorder Point) answers **WHEN** to buy: it triggers an alert when stock drops below expected lead-time demand plus safety buffer. EOQ (Economic Order Quantity) answers **HOW MUCH** to buy: it calculates the batch size that minimizes total acquisition and holding costs."

---

# MEMBER 4: Spatial Emergency Triage, Real-Time SSE & Grounded AI Assistant

### 4.1 Role & Files You Own
* **Your Title:** Real-Time Systems, Spatial Emergency & AI Integration Engineer
* **Files You Built / Modified:**
  * `backend/app/services/spatial_emergency.py` (**Haversine Distance & Hospital Radar Engine**)
  * `backend/app/routes/emergency_routes.py` (Bed capacity & atomic dispatch endpoints)
  * `backend/app/services/sse_websocket.py` & `routes/stream_routes.py` (**Server-Sent Events Broadcaster**)
  * `backend/app/services/antigravity_agent.py` & `routes/assistant_routes.py` (**Grounded AI Decision Support**)
  * `frontend/src/components/EmergencyHospitalFinder.tsx` (Hospital radar & bed management)
  * `frontend/src/components/AlertFeed.tsx` & `AIAssistantDrawer.tsx` (Live activity feed & AI drawer)
  * `tests/test_workflows.py` (End-to-end automated integration tests)

---

### 4.2 Technical Explanation (What You Did Under the Hood)
1. **Spatial Emergency Radar & Haversine Algorithm:**
   * In mass casualty incidents, finding the nearest facility with open trauma beds is vital.
   * Implemented the spherical **Haversine Distance Formula** ($R = 6371\text{ km}$) in `spatial_emergency.py`:
     $$a = \sin^2\left(\frac{\Delta \text{lat}}{2}\right) + \cos(\text{lat}_1)\cos(\text{lat}_2)\sin^2\left(\frac{\Delta \text{lon}}{2}\right)$$
     $$d = 2 \cdot R \cdot \text{atan2}(\sqrt{a}, \sqrt{1 - a})$$
   * Ranks regional hospitals dynamically by proximity, travel time, and ICU/trauma bed availability.
2. **Atomic Patient Dispatch & Rejection/Divert Controls:**
   * In `emergency_routes.py`, built the transfer workflow:
     * **"Accept & Admit"**: Reserves the destination hospital's beds and decrements available capacity.
     * **"Reject / Divert"**: Declines a transfer, logs the clinical reason, and frees capacity for local intake.
     * **Live Bed Controls**: "+ Admit" and "− Discharge" buttons for real-time ward tracking.
3. **Real-Time Server-Sent Events (SSE) Broadcaster:**
   * Built the live streaming architecture using standard HTTP `text/event-stream` on `/api/stream/events`.
   * When orders are approved, stock is dispensed, or beds are transferred, `sse_broadcaster` pushes an event to all open browser connections.
4. **Grounded AI Decision-Support Assistant (RAG):**
   * Built `AntigravityInventoryAgent` using **Retrieval-Augmented Generation (RAG)** backed by the Google Gemini API.
   * Injects a real-time factual SQL database snapshot (current stock, expiring batches, bed occupancy) into the prompt.
   * Produces **clickable audit citations** linking directly to database records, eliminating AI hallucinations.
5. **Testing & Quality Assurance:**
   * Authored `tests/test_workflows.py` covering 12 end-to-end integration test suites (all passing).

---

### 4.3 Your Spoken Presentation Script

#### [ACTION]
* Click **"Emergency & Beds"** in the sidebar.
* Point to the **Spatial Network Radar** and nearby hospitals (*Apex Trauma*, *Metro General*).
* Select a hospital from the dropdown, click **"Accept & Admit"** on an incoming patient transfer to demonstrate real-time bed deduction.
* Click the **"+ Admit"** and **"− Discharge"** buttons to show live bed count updates.
* Click the floating **"AI Assistant"** button in the bottom-right corner.
* Ask: *"Which medicines are running low on stock?"* $\rightarrow$ Point to the response with audit citations.

#### [SAY THIS]
> *"Thank you, [Member 3]. I am [Your Name], and I built our **Spatial Emergency Triage, Real-Time Streaming, and Grounded AI Assistant**.
>
> During multi-vehicle accidents or natural disasters, hospital emergency rooms quickly become overwhelmed. Paramedics need to know where to divert ambulances immediately.
>
> In `spatial_emergency.py`, I implemented our **Spatial Emergency Engine** using the **Haversine Distance Formula**. It calculates great-circle spherical distances between GPS coordinates to rank regional hospitals by distance, travel time, and available ICU and trauma beds.
>
> In `emergency_routes.py`, I built our atomic dispatch workflow:
> - Clicking **Accept & Admit** reserves the required beds at the destination facility and decrements available capacity immediately.
> - If a hospital reaches surge capacity, staff can click **Reject / Divert** to safely re-route the ambulance.
> - Staff can also use the **+ Admit** and **− Discharge** controls for live ward management.
>
> To keep all connected staff dashboards synchronized, I built a real-time **Server-Sent Events (SSE)** broadcaster in `sse_websocket.py`. When an action occurs, the backend pushes an event over standard HTTP port 8000, allowing the React frontend to revalidate its state with zero manual page reloads.
>
> Finally, I integrated our **Grounded AI Decision Support Assistant**. In healthcare, ungrounded AI that hallucinates fictional drugs is dangerous. Our assistant uses **Retrieval-Augmented Generation (RAG)**: it takes a live snapshot of our SQL database, injects it into the reasoning context, and outputs responses with **clickable audit citations** linking directly to batch numbers and SKU codes.
>
> I also created our automated test suite in `tests/test_workflows.py`, which validates all 12 core backend workflows with 100% pass rates.
>
> This concludes our presentation of Lok Sahayak. We are now happy to answer your questions!"*

---

### 4.4 Teacher Defense Questions for Member 4
* **Q1: "Why did you use Server-Sent Events (SSE) instead of WebSockets?"**
  * *Answer:* "WebSockets are bidirectional and require custom protocol framing and connection management. Hospital dashboards primarily require server-to-client push (database updates reaching the screen). SSE operates over standard HTTP/1.1 or HTTP/2, easily traverses hospital enterprise firewalls without proxy configuration, and has native automatic browser reconnection built-in."
* **Q2: "How do you guarantee your AI Assistant doesn't hallucinate?"**
  * *Answer:* "We use strict Retrieval-Augmented Generation (RAG). In `assistant_routes.py`, we execute SQL queries to fetch live stock counts, expiring batches, and bed occupancy before calling the model. The prompt explicitly restricts the agent to cite only the provided entity IDs. If an item isn't in the database, the agent cannot invent it."

---

## 5-Minute Rehearsal Checklist

1. **Member 1 (0:00 - 1:15):** Pitch, Next.js architecture, Role Perspectives demo, Search bar demo.
2. **Member 2 (1:15 - 2:30):** Relational schema (Item vs Batch), FEFO dispensing demo, atomicity & risk score.
3. **Member 3 (2:30 - 3:45):** Ridge Regression forecasting demo (14d/30d/60d), EOQ restock approval demo, Milvus NLP.
4. **Member 4 (3:45 - 5:00):** Haversine radar demo, bed accept/reject demo, SSE explanation, AI Assistant demo with citations.
