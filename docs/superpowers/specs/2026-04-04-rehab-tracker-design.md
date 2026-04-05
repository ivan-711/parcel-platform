# Rehab Tracker — Design Spec

## Overview

Build rehab project and item tracking: models, migration, CRUD endpoints, rehab projects list page, project detail with items table and budget visualization, Bricked AI import, property detail integration. Financial tracker only — no project management features.

## Design System

Same as all prior sprints — no new tokens.

## Architecture Decisions

- **Two models**: `RehabProject` (per-property) and `RehabItem` (line items within a project). One-to-many relationship.
- **Bricked import**: Auto-populate items from existing Bricked repair estimates stored in `AnalysisScenario.inputs_extended`. Maps Bricked `{repair, cost, description}` to `RehabItem` entries.
- **Calculator integration**: Read-only reference. Analysis page shows "Rehab tracker: $X" as informational note. Calculator `repair_cost` stays independently editable.
- **Budget recalculation**: Project `estimated_budget` and `actual_spent` are recomputed from items after every item create/update/delete. No separate aggregate columns that drift.
- **Soft delete**: Both models use `deleted_at` timestamp (same pattern as financing).
- **Router prefix**: `/api/rehab` — follows newer router pattern.

---

## 1. Backend: Models + Migration

### RehabProject

```
rehab_projects table:
  id              UUID PK (from TimestampMixin)
  property_id     UUID FK → properties.id, NOT NULL, indexed
  deal_id         UUID FK → deals.id, nullable
  created_by      UUID, NOT NULL, indexed
  team_id         UUID, nullable
  name            String, NOT NULL
  status          String, NOT NULL, default "planning"
                  Values: planning | in_progress | completed | on_hold
  estimated_budget Numeric(14,2), nullable  — computed from items
  actual_spent    Numeric(14,2), nullable, default 0  — computed from items
  start_date      Date, nullable
  target_completion Date, nullable
  actual_completion Date, nullable
  notes           Text, nullable
  deleted_at      DateTime, nullable
  created_at      DateTime (TimestampMixin)
  updated_at      DateTime (TimestampMixin)
```

### RehabItem

```
rehab_items table:
  id              UUID PK (from TimestampMixin)
  project_id      UUID FK → rehab_projects.id, NOT NULL, indexed
  created_by      UUID, NOT NULL
  category        String, NOT NULL
                  Values: kitchen | bathroom | flooring | roof | hvac | plumbing |
                          electrical | exterior | foundation | windows_doors |
                          painting | landscaping | general | permits | other
  description     String, NOT NULL
  estimated_cost  Numeric(10,2), nullable
  actual_cost     Numeric(10,2), nullable
  status          String, NOT NULL, default "planned"
                  Values: planned | in_progress | completed | skipped
  contractor_name String, nullable
  contractor_bid  Numeric(10,2), nullable
  priority        String, nullable, default "normal"
                  Values: critical | high | normal | low
  notes           Text, nullable
  deleted_at      DateTime, nullable
  created_at      DateTime (TimestampMixin)
  updated_at      DateTime (TimestampMixin)
```

### Relationships

- `Property.rehab_projects` → one-to-many
- `RehabProject.items` → one-to-many with cascade
- `RehabProject.property` → back_populates

### Migration

Single Alembic migration creating both tables with indexes on `property_id`, `project_id`, `created_by`.

---

## 2. Backend: Rehab Schemas

Create: `backend/schemas/rehab.py`

```
CreateRehabProjectRequest:
  property_id: UUID (required)
  name: str (required)
  deal_id: Optional[UUID]
  status: str = "planning"
  start_date: Optional[date]
  target_completion: Optional[date]
  notes: Optional[str]
  import_bricked: bool = False  — if true, auto-populate items from Bricked estimates

UpdateRehabProjectRequest:
  name, status, start_date, target_completion, actual_completion, notes — all optional

RehabProjectResponse:
  All model fields + computed:
    item_count: int
    total_estimated: float
    total_actual: float
    budget_variance: float  — (estimated - actual), positive = under budget
    completion_pct: float   — completed items / total items * 100
    property_address: str

RehabItemResponse:
  All model fields

CreateRehabItemRequest:
  category: str (required)
  description: str (required)
  estimated_cost: Optional[Decimal]
  actual_cost: Optional[Decimal]
  status: str = "planned"
  contractor_name: Optional[str]
  contractor_bid: Optional[Decimal]
  priority: str = "normal"
  notes: Optional[str]

UpdateRehabItemRequest:
  All fields optional

BulkCreateItemsRequest:
  items: list[CreateRehabItemRequest]

CategorySummary:
  category: str
  estimated: float
  actual: float
  variance: float
  item_count: int
  completed_count: int

ProjectSummaryResponse:
  total_estimated: float
  total_actual: float
  total_variance: float
  overall_completion_pct: float
  by_category: list[CategorySummary]
```

---

## 3. Backend: Rehab Router

Create: `backend/routers/rehab.py`
Register in: `backend/main.py`

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/rehab/projects` | List projects with summary stats |
| GET | `/api/rehab/projects/:id` | Project detail with all items |
| POST | `/api/rehab/projects` | Create project (optionally import Bricked) |
| PATCH | `/api/rehab/projects/:id` | Update project |
| DELETE | `/api/rehab/projects/:id` | Soft delete project |
| POST | `/api/rehab/projects/:id/items` | Add item, recalc totals |
| PATCH | `/api/rehab/projects/:id/items/:itemId` | Update item, recalc totals |
| DELETE | `/api/rehab/projects/:id/items/:itemId` | Soft delete item, recalc totals |
| POST | `/api/rehab/projects/:id/items/bulk` | Bulk add items |
| GET | `/api/rehab/projects/:id/summary` | Category-level summary |

### Budget Recalculation

After every item create/update/delete, recompute:
```python
project.estimated_budget = sum(item.estimated_cost for active items)
project.actual_spent = sum(item.actual_cost for active items where actual_cost is not null)
```

### Bricked Import

On `POST /api/rehab/projects` with `import_bricked=True`:
1. Query `AnalysisScenario` for the property
2. Check `inputs_extended` for Bricked repair data (key: repairs or bricked_repairs)
3. Also check the comps endpoint pattern — `api.analysis.getComps(scenarioId)` returns `repairs[]`
4. Map each repair to a `RehabItem`:
   - `category`: map repair name to category (e.g., "Kitchen countertops" → "kitchen", "Roof replacement" → "roof", default "general")
   - `description`: repair name
   - `estimated_cost`: cost from Bricked
   - `status`: "planned"
   - `notes`: "Imported from AI estimate"

### Category Mapping for Bricked Imports

```python
CATEGORY_KEYWORDS = {
    "kitchen": ["kitchen", "cabinet", "countertop", "appliance", "sink"],
    "bathroom": ["bathroom", "bath", "shower", "toilet", "vanity"],
    "flooring": ["floor", "carpet", "tile", "hardwood", "vinyl"],
    "roof": ["roof", "shingle", "gutter"],
    "hvac": ["hvac", "furnace", "ac", "air condition", "heating", "cooling"],
    "plumbing": ["plumb", "pipe", "water heater", "faucet"],
    "electrical": ["electric", "wiring", "panel", "outlet"],
    "exterior": ["siding", "deck", "porch", "stucco", "facade"],
    "foundation": ["foundation", "basement", "crawl"],
    "windows_doors": ["window", "door", "glass"],
    "painting": ["paint", "primer", "stain"],
    "landscaping": ["landscape", "yard", "fence", "driveway"],
    "permits": ["permit", "inspection"],
}
# Default: "general"
```

---

## 4. Frontend: Types + API + Hooks

### Types (add to `types/index.ts` or new `types/rehab.ts`)

```typescript
interface RehabProject {
  id: string
  property_id: string
  deal_id: string | null
  created_by: string
  name: string
  status: string
  estimated_budget: number | null
  actual_spent: number | null
  start_date: string | null
  target_completion: string | null
  actual_completion: string | null
  notes: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
  // Computed
  item_count: number
  total_estimated: number
  total_actual: number
  budget_variance: number
  completion_pct: number
  property_address: string
}

interface RehabItem {
  id: string
  project_id: string
  created_by: string
  category: string
  description: string
  estimated_cost: number | null
  actual_cost: number | null
  status: string
  contractor_name: string | null
  contractor_bid: number | null
  priority: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

interface RehabProjectDetail extends RehabProject {
  items: RehabItem[]
}

interface RehabCategorySummary {
  category: string
  estimated: number
  actual: number
  variance: number
  item_count: number
  completed_count: number
}

interface RehabProjectSummary {
  total_estimated: number
  total_actual: number
  total_variance: number
  overall_completion_pct: number
  by_category: RehabCategorySummary[]
}
```

### API Namespace

```typescript
api.rehab = {
  projects: {
    list: (filters?) => GET /api/rehab/projects,
    get: (id) => GET /api/rehab/projects/:id,
    create: (data) => POST /api/rehab/projects,
    update: (id, data) => PATCH /api/rehab/projects/:id,
    delete: (id) => DELETE /api/rehab/projects/:id,
    summary: (id) => GET /api/rehab/projects/:id/summary,
  },
  items: {
    create: (projectId, data) => POST /api/rehab/projects/:id/items,
    update: (projectId, itemId, data) => PATCH /api/rehab/projects/:id/items/:itemId,
    delete: (projectId, itemId) => DELETE /api/rehab/projects/:id/items/:itemId,
    bulkCreate: (projectId, data) => POST /api/rehab/projects/:id/items/bulk,
  },
}
```

### Hooks (`hooks/useRehab.ts`)

- `useRehabProjects(filters?)` — queryKey: `['rehab', 'projects', filters]`
- `useRehabProject(id)` — queryKey: `['rehab', 'projects', id]`
- `useRehabSummary(id)` — queryKey: `['rehab', 'summary', id]`
- `useCreateRehabProject()` — invalidates `['rehab']`
- `useUpdateRehabProject()` — invalidates `['rehab']`
- `useDeleteRehabProject()` — invalidates `['rehab']`
- `useCreateRehabItem()` — invalidates `['rehab']`
- `useUpdateRehabItem()` — invalidates `['rehab']`
- `useDeleteRehabItem()` — invalidates `['rehab']`

---

## 5. Frontend: Unlock Rehabs Nav + Routes

Modify: `nav-data.ts` — remove `locked: true` from Rehabs

Modify: `App.tsx` — add routes:
- `/rehabs` → RehabsPage
- `/rehabs/:projectId` → RehabDetailPage

Remove `/rehabs` from locked features block.

---

## 6. Frontend: Rehab Projects Page

Create: `frontend/src/pages/rehab/RehabsPage.tsx`
Route: `/rehabs`

### Layout

```
Header: "Rehab Projects" title + "New Project" button
Project cards grid (2 columns desktop, 1 mobile)
```

### Project Card

- Property address + project name
- Status badge: Planning (gray), In Progress (blue), Completed (green), On Hold (yellow)
- Budget bar: horizontal progress bar
  - Green fill = actual_spent / estimated_budget
  - Red overflow if actual > estimated
  - Labels: "$38K of $52K" or "$55K of $52K (over budget)"
- Completion: "4 of 12 items complete (33%)"
- Date range: "Mar 1 — May 15"
- Click → navigates to `/rehabs/:id`

### Empty State

"No rehab projects yet. Start tracking renovation costs on your properties."

---

## 7. Frontend: Rehab Detail Page

Create: `frontend/src/pages/rehab/RehabDetailPage.tsx`
Route: `/rehabs/:projectId`

### Header

- Project name (editable) + property address breadcrumb
- Status dropdown (editable)
- Budget KPIs: Estimated | Actual | Variance (green under, red over)
- Date range with days remaining

### Budget Overview

Horizontal stacked bar showing each category's proportion of total cost. Color-coded by category.

### Items Table

| Column | Content |
|--------|---------|
| Category | Colored badge |
| Description | Text |
| Estimated | Dollar amount |
| Actual | Dollar amount (editable inline) |
| Contractor | Name |
| Status | Badge (clickable to cycle) |
| Actions | Edit, Delete |

"Add Item" button opens inline form or small modal.

### Category Summary Cards

Grid of cards below table, one per category with items:
- Category name + icon
- Estimated vs actual with mini progress bar
- "3 of 5 complete"

### Import from AI Estimate

Button shown when property has Bricked repair data. Fetches estimates, shows preview, user confirms import. Creates items with "AI Estimate" badge.

---

## 8. Frontend: Property Detail Integration

Modify: `PropertyDetailPage.tsx` — Overview tab

If property has rehab projects, show compact card:
- Project name + status badge
- Budget bar (compact)
- "View Project" link → `/rehabs/:id`

If no projects: "Create Rehab Project" link.

---

## 9. PostHog Events

- `rehab_project_created` — `{property_id, has_bricked_import}`
- `rehab_item_added` — `{category, has_contractor}`
- `rehab_item_completed` — `{category, was_over_budget}`
- `rehab_bricked_imported` — `{item_count, total_estimated}`
- `rehab_project_completed` — `{total_variance_pct, duration_days}`

---

## Definition of Done

- [ ] RehabProject and RehabItem models with migration
- [ ] Full CRUD endpoints for projects and items with budget recalculation
- [ ] Bricked estimate auto-import with category mapping
- [ ] Rehabs nav unlocked and routes registered
- [ ] Rehab projects list page with budget bars
- [ ] Rehab detail page with items table, budget viz, category summary
- [ ] Import from AI estimate flow
- [ ] Property detail shows rehab summary
- [ ] Frontend build clean
- [ ] Backend syntax clean
