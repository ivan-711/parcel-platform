# Team/Multi-Seat Billing Architecture for Parcel

Research document covering organization models, Stripe seat-based billing,
invitation flows, RBAC, data isolation, and migration paths for the Parcel
real estate deal analysis platform.

---

## 1. Organization / Team Model Design

Parcel already has `teams` and `team_members` tables. The current schema is
minimal -- a team has a name, a creator, and members with roles (owner /
analyst / viewer). To support billing, the team model needs to become the
**billing entity** (the "organization" in SaaS terminology).

### Proposed Schema Extensions

```python
# backend/models/teams.py — extended

class Team(TimestampMixin, Base):
    __tablename__ = "teams"

    name = Column(String(120), nullable=False)
    slug = Column(String(120), unique=True, nullable=False, index=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    # Billing fields
    stripe_customer_id = Column(String(255), nullable=True, unique=True)
    stripe_subscription_id = Column(String(255), nullable=True, unique=True)
    plan = Column(
        Enum("free", "solo_pro", "team", name="teamplan"),
        nullable=False,
        default="free",
        server_default="free",
    )
    seat_limit = Column(Integer, nullable=False, default=1, server_default="1")
    ai_message_limit = Column(Integer, nullable=False, default=50, server_default="50")
    ai_messages_used = Column(Integer, nullable=False, default=0, server_default="0")
    ai_message_reset_at = Column(DateTime, nullable=True)  # Next billing-cycle reset

    # Branding (Team tier)
    brand_logo_url = Column(String(500), nullable=True)
    brand_company_name = Column(String(200), nullable=True)
    brand_primary_color = Column(String(7), nullable=True)  # hex, e.g. "#6366F1"

    # Soft delete
    deleted_at = Column(DateTime, nullable=True)

    # Relationships
    members = relationship("TeamMember", back_populates="team")
    invitations = relationship("TeamInvitation", back_populates="team")
    deals = relationship("Deal", back_populates="team", foreign_keys="Deal.team_id")
```

The key design decision: **every paying account is a "team," even solo users.**
A Solo Pro subscriber is simply a team with `seat_limit=1`. This avoids two
separate billing code paths and makes upgrading from Solo Pro to Team a matter
of changing `plan` and `seat_limit`.

### Team Invitation Model (new table)

```python
# backend/models/team_invitations.py

InvitationStatus = Enum("pending", "accepted", "expired", "revoked", name="invitationstatus")

class TeamInvitation(TimestampMixin, Base):
    __tablename__ = "team_invitations"

    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id"), nullable=False, index=True)
    email = Column(String(255), nullable=False)
    role = Column(
        Enum("admin", "member", name="inviterole"),
        nullable=False,
        default="member",
    )
    invited_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    token_hash = Column(String(64), nullable=False, unique=True)  # SHA-256 of invite token
    status = Column(InvitationStatus, nullable=False, default="pending")
    expires_at = Column(DateTime, nullable=False)
    accepted_at = Column(DateTime, nullable=True)

    # Relationships
    team = relationship("Team", back_populates="invitations")
    inviter = relationship("User", foreign_keys=[invited_by])
```

### Updated TeamMember Roles

The current roles are `owner / analyst / viewer`. For billing purposes, the
role taxonomy should be:

```python
TeamMemberRole = Enum("owner", "admin", "member", name="teammemberrole")
```

- **Owner**: one per team. The billing contact. Can delete the team.
- **Admin**: can invite/remove members, manage deals, manage pipeline.
- **Member**: can create/edit own deals, view team deals, use AI chat.

Migration note: rename `analyst` -> `admin` and `viewer` -> `member` in the
existing `team_members` table via an Alembic migration.

---

## 2. Seat-Based Billing with Stripe

### Stripe Product/Price Setup

Parcel needs two Stripe Products:

| Product       | Price ID Pattern        | Unit     | Amount   | Interval |
|---------------|------------------------|----------|----------|----------|
| Solo Pro      | `price_solo_monthly`   | flat     | $49/mo   | monthly  |
| Team          | `price_team_monthly`   | per_seat | $149/mo for first 5 seats, $29/seat beyond | monthly |

For the Team tier, Stripe supports **tiered pricing** or a **base + per-seat**
model. The cleanest approach for Parcel's "$149/mo for 5 seats" pricing:

**Option A: Flat base + metered seats (recommended)**

Create two prices on the Team product:
1. A flat $149/month base price (includes 5 seats)
2. A $29/month per-unit price for additional seats beyond 5

```python
# Creating the subscription with Stripe API
import stripe

subscription = stripe.Subscription.create(
    customer=team.stripe_customer_id,
    items=[
        {"price": "price_team_base_monthly"},       # $149 flat
        {"price": "price_team_extra_seat_monthly",   # $29/seat
         "quantity": max(0, seat_count - 5)},
    ],
    payment_behavior="default_incomplete",
    expand=["latest_invoice.payment_intent"],
)
```

**Option B: Tiered pricing (simpler but less flexible)**

Use Stripe's graduated tiers on a single price:

```python
# Stripe Dashboard or API configuration
stripe.Price.create(
    product="prod_team",
    currency="usd",
    recurring={"interval": "month"},
    billing_scheme="tiered",
    tiers_mode="graduated",
    tiers=[
        {"up_to": 5, "flat_amount": 14900},   # First 5 seats: $149 total
        {"up_to": "inf", "unit_amount": 2900}, # Each additional: $29
    ],
)
```

**Recommendation: Option A.** It gives you explicit control over the base
charge vs. per-seat charges. It also makes invoices clearer for customers
("Team Plan: $149 + 3 extra seats x $29 = $236").

### Stripe Webhook Events to Handle

```
checkout.session.completed     -> Provision team, set plan
customer.subscription.updated  -> Sync plan/seats, handle upgrades/downgrades
customer.subscription.deleted  -> Downgrade to free, disable team features
invoice.payment_succeeded      -> Reset AI message counter, update billing date
invoice.payment_failed         -> Email owner, set grace period flag
```

### Backend Webhook Handler Skeleton

```python
# backend/routers/billing.py

@router.post("/webhooks/stripe")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    sig = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig, settings.STRIPE_WEBHOOK_SECRET
        )
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        team_id = session["metadata"]["team_id"]
        team = db.query(Team).filter(Team.id == team_id).first()
        team.stripe_customer_id = session["customer"]
        team.stripe_subscription_id = session["subscription"]
        team.plan = session["metadata"]["plan"]
        team.seat_limit = int(session["metadata"]["seat_limit"])
        db.commit()

    elif event["type"] == "invoice.payment_succeeded":
        subscription_id = event["data"]["object"]["subscription"]
        team = db.query(Team).filter(
            Team.stripe_subscription_id == subscription_id
        ).first()
        if team:
            team.ai_messages_used = 0
            team.ai_message_reset_at = datetime.utcnow() + timedelta(days=30)
            db.commit()

    elif event["type"] == "customer.subscription.deleted":
        subscription_id = event["data"]["object"]["id"]
        team = db.query(Team).filter(
            Team.stripe_subscription_id == subscription_id
        ).first()
        if team:
            team.plan = "free"
            team.seat_limit = 1
            team.stripe_subscription_id = None
            db.commit()

    return {"status": "ok"}
```

---

## 3. Invitation Flow

### Sequence: Owner Invites Member via Email

```
1. Owner POST /teams/{team_id}/invitations  { email, role }
2. Backend:
   a. Check seat_limit — if current members + pending invites >= limit, return 402
   b. Generate cryptographic token (secrets.token_urlsafe(32))
   c. Store SHA-256 hash in team_invitations table
   d. Send email via Resend: "You've been invited to join {team.name} on Parcel"
   e. Email contains link: {FRONTEND_URL}/invite/{raw_token}
3. Invitee clicks link:
   a. If not logged in -> redirect to /register with ?invite={token} in query
   b. If logged in -> POST /teams/invitations/{token}/accept
4. Backend accept:
   a. Validate token hash, check not expired/revoked
   b. Check seat limit again (race condition guard)
   c. Create TeamMember row (user_id, team_id, role from invitation)
   d. Set user.team_id = team.id (sets the user's active team context)
   e. Mark invitation as accepted
   f. Return team details
```

### Invitation Endpoint

```python
@router.post("/{team_id}/invitations")
async def invite_member(
    team_id: UUID,
    body: InviteRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    team = _get_team_as_admin(team_id, current_user, db)

    # Seat limit check (members + pending invitations)
    current_count = db.query(func.count(TeamMember.id)).filter(
        TeamMember.team_id == team_id
    ).scalar()
    pending_count = db.query(func.count(TeamInvitation.id)).filter(
        TeamInvitation.team_id == team_id,
        TeamInvitation.status == "pending",
    ).scalar()

    if current_count + pending_count >= team.seat_limit:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={
                "error": f"Seat limit reached ({team.seat_limit}). Upgrade to add more seats.",
                "code": "SEAT_LIMIT_REACHED",
            },
        )

    raw_token = secrets.token_urlsafe(32)
    invitation = TeamInvitation(
        team_id=team_id,
        email=body.email,
        role=body.role,
        invited_by=current_user.id,
        token_hash=hashlib.sha256(raw_token.encode()).hexdigest(),
        expires_at=datetime.utcnow() + timedelta(days=7),
    )
    db.add(invitation)
    db.commit()

    # Send email (fire-and-forget, same pattern as password reset)
    send_team_invitation_email(body.email, team.name, raw_token)

    return {"message": "Invitation sent", "email": body.email}
```

---

## 4. Role-Based Access Control (RBAC)

### Permission Matrix

| Action                        | Owner | Admin | Member |
|-------------------------------|:-----:|:-----:|:------:|
| View team dashboard           |  yes  |  yes  |  yes   |
| View team deals               |  yes  |  yes  |  yes   |
| Create deals                  |  yes  |  yes  |  yes   |
| Edit own deals                |  yes  |  yes  |  yes   |
| Edit any team deal            |  yes  |  yes  |   no   |
| Delete any team deal          |  yes  |  yes  |   no   |
| View team pipeline            |  yes  |  yes  |  yes   |
| Move cards on pipeline        |  yes  |  yes  |  yes   |
| View team documents           |  yes  |  yes  |  yes   |
| Upload documents              |  yes  |  yes  |  yes   |
| Delete any team document      |  yes  |  yes  |   no   |
| Use AI chat (shared pool)     |  yes  |  yes  |  yes   |
| View AI chat of other members |   no  |   no  |   no   |
| Invite members                |  yes  |  yes  |   no   |
| Remove members                |  yes  |  yes  |   no   |
| Change member roles           |  yes  |   no  |   no   |
| Manage billing / subscription |  yes  |   no  |   no   |
| Configure custom branding     |  yes  |  yes  |   no   |
| Transfer ownership            |  yes  |   no  |   no   |
| Delete team                   |  yes  |   no  |   no   |

### Implementation: Permission Dependency

```python
# backend/core/security/permissions.py

from enum import Enum
from functools import wraps

class Permission(str, Enum):
    VIEW_TEAM = "view_team"
    MANAGE_DEALS = "manage_deals"        # Edit/delete any team deal
    MANAGE_MEMBERS = "manage_members"    # Invite, remove
    MANAGE_BILLING = "manage_billing"    # Stripe portal, plan changes
    MANAGE_BRANDING = "manage_branding"  # Logo, colors
    TRANSFER_OWNERSHIP = "transfer_ownership"
    DELETE_TEAM = "delete_team"

ROLE_PERMISSIONS: dict[str, set[Permission]] = {
    "owner": {
        Permission.VIEW_TEAM,
        Permission.MANAGE_DEALS,
        Permission.MANAGE_MEMBERS,
        Permission.MANAGE_BILLING,
        Permission.MANAGE_BRANDING,
        Permission.TRANSFER_OWNERSHIP,
        Permission.DELETE_TEAM,
    },
    "admin": {
        Permission.VIEW_TEAM,
        Permission.MANAGE_DEALS,
        Permission.MANAGE_MEMBERS,
        Permission.MANAGE_BRANDING,
    },
    "member": {
        Permission.VIEW_TEAM,
    },
}


def require_team_permission(permission: Permission):
    """FastAPI dependency that checks the current user has the given
    permission within their active team."""
    async def dependency(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> User:
        if not current_user.team_id:
            raise HTTPException(403, detail="No active team")

        membership = db.query(TeamMember).filter(
            TeamMember.user_id == current_user.id,
            TeamMember.team_id == current_user.team_id,
        ).first()

        if not membership:
            raise HTTPException(403, detail="Not a team member")

        role_perms = ROLE_PERMISSIONS.get(membership.role, set())
        if permission not in role_perms:
            raise HTTPException(403, detail="Insufficient permissions")

        return current_user
    return dependency
```

Usage in a router:

```python
@router.post("/{team_id}/invitations")
async def invite_member(
    team_id: UUID,
    body: InviteRequest,
    current_user: User = Depends(require_team_permission(Permission.MANAGE_MEMBERS)),
    db: Session = Depends(get_db),
):
    ...
```

---

## 5. Shared vs. Private Data

This is the most consequential architectural decision. Here is the recommended
data visibility model:

| Data Type         | Solo User       | Team Member                          |
|-------------------|-----------------|--------------------------------------|
| **Deals**         | own only        | Own + all deals where `team_id` matches |
| **Pipeline**      | own only        | Shared board -- all team pipeline entries visible |
| **Documents**     | own only        | Own uploads visible to team; can view team docs |
| **Portfolio**     | own only        | Team portfolio -- aggregated view    |
| **AI Chat**       | own only        | **Private** -- each user's chat history is theirs alone |
| **Dashboard**     | own stats       | Team-aggregated stats with per-member breakdown |

### Why AI Chat Stays Private

AI chat sessions often contain exploratory thinking, half-formed deal ideas,
and sensitive negotiation questions. Making these visible to the team creates
a chilling effect on usage. Every competing product (Lofty, DealCheck, Stessa)
keeps chat/notes private to the individual user, with explicit sharing as an
opt-in action.

The **AI message quota**, however, is shared across the team (see section 11).

### Query Pattern Change: Team-Aware Data Access

Current deal listing in `routers/deals.py`:

```python
# CURRENT: only own deals
q = db.query(Deal).filter(
    Deal.user_id == current_user.id,
    Deal.deleted_at.is_(None),
)
```

Team-aware version:

```python
# PROPOSED: own deals + team deals
def _user_deals_filter(current_user: User):
    """Return a SQLAlchemy filter for deals visible to the current user."""
    if current_user.team_id:
        return and_(
            or_(
                Deal.user_id == current_user.id,
                Deal.team_id == current_user.team_id,
            ),
            Deal.deleted_at.is_(None),
        )
    return and_(
        Deal.user_id == current_user.id,
        Deal.deleted_at.is_(None),
    )
```

This pattern applies to deals, pipeline_entries, portfolio_entries, and
documents. It does NOT apply to chat_messages.

### Assigning Deals to a Team

When a team member creates a deal, the backend should automatically set
`team_id` to the user's active team:

```python
deal = Deal(
    user_id=current_user.id,
    team_id=current_user.team_id,  # None for solo users, UUID for team members
    ...
)
```

This already happens in the pipeline router (`entry.team_id = current_user.team_id`).
The deals router currently hard-codes `team_id=None` -- this needs to change.

---

## 6. Billing Owner Concept

### Rules

1. **One owner per team.** The user who created the team starts as owner.
2. **Only the owner can access Stripe billing portal** (manage payment method,
   view invoices, cancel subscription).
3. **Ownership can be transferred** to another admin. This is an explicit action,
   not automatic. The Stripe customer's email is updated to the new owner's email.
4. **If the owner leaves**, ownership must be transferred first. The backend
   should block `DELETE /teams/{id}/members/{owner_id}` with a 400 error:
   "Transfer ownership before leaving the team."

### Stripe Customer Portal

Stripe Billing Portal handles payment method updates, invoice history, and
plan changes without you building custom UI:

```python
@router.post("/teams/{team_id}/billing-portal")
async def create_billing_portal_session(
    team_id: UUID,
    current_user: User = Depends(require_team_permission(Permission.MANAGE_BILLING)),
    db: Session = Depends(get_db),
):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team or not team.stripe_customer_id:
        raise HTTPException(400, detail="No billing account")

    session = stripe.billing_portal.Session.create(
        customer=team.stripe_customer_id,
        return_url=f"{settings.FRONTEND_URL}/settings/billing",
    )
    return {"url": session.url}
```

The frontend opens `session.url` in the same tab. Stripe handles everything.

---

## 7. Seat Management: Add/Remove Seats Mid-Cycle

### Adding a Seat

When an owner invites a 6th member (exceeding the base 5):

```python
async def add_seat_to_subscription(team: Team):
    """Increment the extra-seat line item on the Stripe subscription."""
    subscription = stripe.Subscription.retrieve(team.stripe_subscription_id)

    # Find the per-seat item
    seat_item = next(
        (item for item in subscription["items"]["data"]
         if item["price"]["id"] == settings.STRIPE_EXTRA_SEAT_PRICE_ID),
        None,
    )

    if seat_item:
        stripe.SubscriptionItem.modify(
            seat_item["id"],
            quantity=seat_item["quantity"] + 1,
            proration_behavior="create_prorations",  # charge immediately, prorated
        )
    else:
        # First extra seat -- add the line item
        stripe.SubscriptionItem.create(
            subscription=team.stripe_subscription_id,
            price=settings.STRIPE_EXTRA_SEAT_PRICE_ID,
            quantity=1,
            proration_behavior="create_prorations",
        )
```

### Removing a Seat

When a member is removed and the team drops below the extra-seat threshold:

```python
async def remove_seat_from_subscription(team: Team, new_member_count: int):
    """Decrement or remove the extra-seat line item."""
    extra_seats_needed = max(0, new_member_count - 5)
    subscription = stripe.Subscription.retrieve(team.stripe_subscription_id)

    seat_item = next(
        (item for item in subscription["items"]["data"]
         if item["price"]["id"] == settings.STRIPE_EXTRA_SEAT_PRICE_ID),
        None,
    )

    if seat_item:
        if extra_seats_needed == 0:
            stripe.SubscriptionItem.delete(
                seat_item["id"],
                proration_behavior="create_prorations",
            )
        else:
            stripe.SubscriptionItem.modify(
                seat_item["id"],
                quantity=extra_seats_needed,
                proration_behavior="create_prorations",
            )
```

### Proration Behavior

Stripe's `create_prorations` flag means:
- **Adding a seat mid-cycle**: the customer is charged a prorated amount for
  the remaining days in the current billing period.
- **Removing a seat mid-cycle**: a prorated credit is applied to the next
  invoice.

This is the standard approach and avoids billing disputes.

---

## 8. Team Onboarding

### Step-by-Step Flow After Team Plan Purchase

```
1. Owner pays via Stripe Checkout -> checkout.session.completed webhook fires
2. Backend creates/upgrades Team record (plan="team", seat_limit=5)
3. Owner is redirected to /settings/team (new page)
4. Owner sees:
   a. Team name (editable)
   b. "Invite Members" section -- email + role picker + send button
   c. Pending invitations list
   d. Current members list with role badges
5. Owner can optionally configure branding (logo, company name, color)
6. Owner's existing deals are migrated (see section 10)
```

### Shared Pipeline Initialization

When a team is created, the pipeline board is already team-aware because
`pipeline_entries.team_id` exists. No separate "team pipeline" table is
needed. The pipeline router simply changes its filter from `user_id` to
`team_id` when the user has an active team.

### Importing Existing Deals

Handled via the migration path (section 10). The owner's existing solo deals
get `team_id` set to the new team, making them instantly visible to all members
on the shared pipeline and deal list.

---

## 9. Data Isolation

### Row-Level Filtering (Application Layer)

Parcel does not use PostgreSQL Row-Level Security (RLS). Instead, data
isolation is enforced at the application layer via query filters. This is
the standard approach for SQLAlchemy-based apps.

#### The Core Rule

Every query that returns user data must include one of:

```python
# Solo user (no team):
.filter(Model.user_id == current_user.id)

# Team member:
.filter(
    or_(
        Model.user_id == current_user.id,
        Model.team_id == current_user.team_id,
    )
)
```

#### Centralized Filter Helper

```python
# backend/core/security/data_access.py

from sqlalchemy import or_, and_

def visible_to_user(model, current_user: User):
    """Return a SQLAlchemy filter clause for data visible to the current user.

    For team members: own data + team data.
    For solo users: own data only.
    """
    base = model.deleted_at.is_(None) if hasattr(model, "deleted_at") else True

    if current_user.team_id:
        ownership = or_(
            model.user_id == current_user.id,
            model.team_id == current_user.team_id,
        )
    else:
        ownership = model.user_id == current_user.id

    return and_(ownership, base)
```

#### Cross-Team Leak Prevention

The most dangerous bug in multi-tenant SaaS is showing Team A's data to
Team B. Defense:

1. **Every query uses the helper above** -- no raw `db.query(Deal).all()`.
2. **Integration tests** that create two teams and assert zero data leakage.
3. **The `_get_owned_deal` helper in deals.py must be updated** to check
   `team_id` in addition to `user_id`:

```python
def _get_accessible_deal(deal_id: UUID, current_user: User, db: Session) -> Deal:
    deal = db.query(Deal).filter(
        Deal.id == deal_id,
        Deal.deleted_at.is_(None),
    ).first()
    if not deal:
        raise HTTPException(404, detail="Deal not found")

    # Access check: user owns it, or it belongs to their team
    is_owner = deal.user_id == current_user.id
    is_team_member = (
        current_user.team_id
        and deal.team_id == current_user.team_id
    )
    if not is_owner and not is_team_member:
        raise HTTPException(403, detail="Access denied")

    return deal
```

### Chat Messages: Strict User Isolation

Chat messages have no `team_id` column intentionally. They are always
filtered by `user_id` only. Even within a team, User A cannot see User B's
chat history.

---

## 10. Migration Path: Solo Pro to Team

### Scenario

A user on Solo Pro ($49/mo) upgrades to Team ($149/mo, 5 seats). Their
existing deals, pipeline entries, portfolio entries, and documents must
be preserved and become team-visible.

### Migration Steps (Backend)

```python
async def upgrade_to_team(user: User, team_name: str, db: Session):
    """Upgrade a solo user to a team owner. Migrates all existing data."""

    # 1. Create team
    team = Team(
        name=team_name,
        slug=slugify(team_name),
        created_by=user.id,
        plan="team",
        seat_limit=5,
        ai_message_limit=500,
    )
    db.add(team)
    db.flush()  # Get team.id without committing

    # 2. Add user as owner
    membership = TeamMember(
        team_id=team.id,
        user_id=user.id,
        role="owner",
    )
    db.add(membership)

    # 3. Set user's active team
    user.team_id = team.id

    # 4. Migrate existing deals to the team
    db.query(Deal).filter(
        Deal.user_id == user.id,
        Deal.deleted_at.is_(None),
    ).update({"team_id": team.id}, synchronize_session="fetch")

    # 5. Migrate pipeline entries
    db.query(PipelineEntry).filter(
        PipelineEntry.user_id == user.id,
    ).update({"team_id": team.id}, synchronize_session="fetch")

    # 6. Migrate portfolio entries
    db.query(PortfolioEntry).filter(
        PortfolioEntry.user_id == user.id,
    ).update({"team_id": team.id}, synchronize_session="fetch")

    # 7. Documents: add team_id column first, then migrate
    # (Documents currently lack team_id -- needs Alembic migration)

    db.commit()
    return team
```

### What About Downgrading?

If a Team owner downgrades to Solo Pro:
1. All non-owner members are removed from the team (notify via email).
2. The team's `plan` is set to `solo_pro`, `seat_limit` to 1.
3. Data stays intact -- the owner can still see everything.
4. Former members lose access to team deals but retain their own deals
   (which they created and have `user_id` set to their ID).

---

## 11. Team Usage Limits: Shared AI Messages

### Architecture Decision: Shared Pool (Not Per-Seat)

The Team tier includes 500 AI messages per billing cycle, shared across
all team members. This is the correct model for Parcel because:

1. **Predictable cost for the team owner.** Per-seat AI quotas (100/user)
   would mean 5 x 100 = 500 anyway, but with uneven usage it penalizes
   power users while wasting quota on light users.
2. **Simple to implement.** One counter (`team.ai_messages_used`) instead
   of per-user tracking.
3. **Industry standard.** Notion AI, Jasper, Copy.ai all use shared team pools.

### Enforcement

```python
# backend/core/ai/usage.py

def check_ai_quota(user: User, db: Session) -> None:
    """Raise 429 if the user's team has exhausted its AI message quota."""
    if not user.team_id:
        # Solo users: check their personal quota (stored on user or team-of-one)
        team = db.query(Team).filter(Team.created_by == user.id).first()
    else:
        team = db.query(Team).filter(Team.id == user.team_id).first()

    if not team:
        raise HTTPException(403, detail="No active plan")

    if team.ai_messages_used >= team.ai_message_limit:
        raise HTTPException(
            status_code=429,
            detail={
                "error": "AI message limit reached for this billing cycle",
                "code": "AI_QUOTA_EXCEEDED",
                "limit": team.ai_message_limit,
                "used": team.ai_messages_used,
                "resets_at": team.ai_message_reset_at.isoformat() if team.ai_message_reset_at else None,
            },
        )


def increment_ai_usage(user: User, db: Session) -> None:
    """Increment the AI message counter after a successful chat response."""
    if user.team_id:
        db.query(Team).filter(Team.id == user.team_id).update(
            {"ai_messages_used": Team.ai_messages_used + 1}
        )
    else:
        team = db.query(Team).filter(Team.created_by == user.id).first()
        if team:
            team.ai_messages_used += 1
    db.commit()
```

### Counter Reset

The counter resets when `invoice.payment_succeeded` fires (see section 2).
This ties the reset to the actual billing cycle, not an arbitrary calendar date.

### Frontend Display

Show a usage bar in the sidebar or settings page:

```
AI Messages: 342 / 500 used  [========------] 68%
Resets Mar 15, 2026
```

---

## 12. Custom Branding: White-Label PDF Reports

### What Custom Branding Means for Team Tier

Team subscribers can upload a company logo, set a company name, and choose
a primary accent color. This branding is applied to:

1. **PDF deal reports** -- logo replaces the Parcel logo, company name
   replaces "Parcel" in the header, accent color replaces indigo.
2. **Shared deal pages** -- the public `/share/{deal_id}` page shows the
   team's branding instead of Parcel's.
3. **Email communications** -- offer letters and shared deal emails use
   the team's branding.

### Branding Data Flow

```
1. Owner uploads logo via /settings/team/branding
2. Backend stores logo in S3, saves URL to team.brand_logo_url
3. Frontend fetches branding from /api/v1/teams/{id}/branding
4. PDF generator receives branding config as parameter
5. If no branding set, falls back to default Parcel branding
```

### PDF Report Integration

The current `frontend/src/lib/pdf-report.ts` uses hard-coded Parcel colors
(INDIGO, DARK_HEADER, etc.). To support custom branding:

```typescript
// frontend/src/lib/pdf-report.ts — proposed branding parameter

interface BrandConfig {
  logoUrl: string | null
  companyName: string        // default: "Parcel"
  primaryColor: [number, number, number]  // default: [99, 102, 241] (indigo)
  headerBg: [number, number, number]      // default: [8, 8, 15]
}

export function generateDealReport(
  deal: DealResponse,
  brand: BrandConfig = DEFAULT_BRAND,
): jsPDF {
  // Use brand.primaryColor instead of INDIGO constant
  // Use brand.companyName instead of "Parcel"
  // If brand.logoUrl, fetch and embed; else use default Parcel logo
  ...
}
```

### Backend Branding Endpoint

```python
@router.get("/teams/{team_id}/branding")
async def get_team_branding(
    team_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(404)

    return {
        "logo_url": team.brand_logo_url,
        "company_name": team.brand_company_name or "Parcel",
        "primary_color": team.brand_primary_color or "#6366F1",
    }


@router.put("/teams/{team_id}/branding")
async def update_team_branding(
    team_id: UUID,
    body: BrandingUpdateRequest,
    current_user: User = Depends(require_team_permission(Permission.MANAGE_BRANDING)),
    db: Session = Depends(get_db),
):
    team = db.query(Team).filter(Team.id == team_id).first()
    if body.company_name is not None:
        team.brand_company_name = body.company_name
    if body.primary_color is not None:
        team.brand_primary_color = body.primary_color
    # Logo upload handled separately via presigned S3 URL
    db.commit()
    return {"status": "updated"}
```

---

## RECOMMENDATIONS FOR PARCEL

Prioritized by implementation order and business impact.

### Phase 1: Foundation (Ship Before Team Tier Launch)

1. **Make every paying account a "team of one."** When a user subscribes to
   Solo Pro, create a Team record with `seat_limit=1`. This unifies the
   billing model and makes the Solo-to-Team upgrade a single `UPDATE`
   instead of a data migration. Affects: `models/teams.py`, checkout flow.

2. **Add `stripe_customer_id` and `stripe_subscription_id` to the Team
   model.** Add `plan`, `seat_limit`, `ai_message_limit`, `ai_messages_used`,
   and `ai_message_reset_at` columns. Run Alembic migration.

3. **Add `team_id` to the Document model.** It is the only user-owned table
   currently missing this FK. Requires Alembic migration + updating the
   documents router queries.

4. **Implement the Stripe webhook handler** (`/webhooks/stripe`). Handle
   `checkout.session.completed`, `invoice.payment_succeeded`,
   `customer.subscription.deleted`, and `invoice.payment_failed`. This is
   the backbone of all billing logic.

5. **Build the `visible_to_user()` query helper** and retrofit it into the
   deals, pipeline, portfolio, documents, and dashboard routers. This is the
   single highest-risk change -- write integration tests for cross-team
   isolation before deploying.

### Phase 2: Invitations and RBAC

6. **Create the `team_invitations` table** and the invitation endpoints
   (POST invite, GET pending, POST accept, DELETE revoke). Reuse the
   password-reset email pattern from `core/email.py`.

7. **Implement the permission system** (`core/security/permissions.py`).
   Start with the dependency `require_team_permission()` and wire it into
   the invitation, billing, and branding endpoints.

8. **Migrate the TeamMember role enum** from `owner/analyst/viewer` to
   `owner/admin/member`. Write an Alembic migration that renames the values
   in the `teammemberrole` enum.

### Phase 3: Billing Portal and Seat Management

9. **Integrate Stripe Checkout** for the initial subscription purchase.
   Pass `team_id` in the session metadata so the webhook can link the
   Stripe customer to the Parcel team.

10. **Implement add/remove seat logic** with Stripe proration. Wire it
    into the invitation-accept and member-remove flows so seat counts
    auto-adjust on the subscription.

11. **Add the Stripe Billing Portal endpoint** so the owner can manage
    payment methods and view invoices without custom UI.

### Phase 4: AI Quotas and Branding

12. **Implement `check_ai_quota()` and `increment_ai_usage()`** in the
    chat router. Show the usage bar in the frontend sidebar. Reset the
    counter on `invoice.payment_succeeded`.

13. **Add branding columns to Team** and build the branding settings UI.
    Modify `pdf-report.ts` to accept a `BrandConfig` parameter instead
    of using hard-coded constants.

14. **Update the shared deal page** (`/share/{deal_id}`) to use the
    team's branding if the deal has a `team_id`.

### Phase 5: Polish and Edge Cases

15. **Ownership transfer endpoint.** POST `/teams/{id}/transfer-ownership`
    with the new owner's user_id. Updates both the TeamMember roles and
    the Stripe customer email.

16. **Downgrade flow.** When a Team subscription is canceled, notify all
    non-owner members, remove their TeamMember rows, and reset `seat_limit`
    to 1. Existing data stays under the owner's account.

17. **Team deletion.** Soft-delete only. Set `team.deleted_at`, remove all
    TeamMember rows, clear `user.team_id` for all members. Data persists
    for 90 days in case of reactivation.

18. **Audit log table.** Track who invited whom, who changed roles, who
    deleted deals. Critical for teams with 5+ members. Low priority for
    launch but important for enterprise trust.

### Architecture Principles

- **Never build two billing code paths.** Solo Pro and Team are the same
  system with different `seat_limit` values.
- **Team data visibility is opt-in at creation time.** Setting `team_id`
  on a deal is what makes it visible. Users can create "private" deals
  by setting `team_id=None` (future feature, not needed for launch).
- **Chat stays private.** This is a firm product decision, not a technical
  limitation. Re-evaluate only if customers explicitly request shared chat.
- **Stripe is the source of truth for billing state.** The database
  mirrors Stripe via webhooks. Never trust client-side plan data for
  access control -- always check `team.plan` server-side.
- **Test cross-team isolation with dedicated fixtures.** Every PR that
  touches a data query should include a test creating two teams and
  asserting zero data leakage between them.
