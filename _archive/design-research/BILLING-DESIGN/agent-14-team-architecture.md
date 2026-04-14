# Team Architecture Design — Multi-User Support for Parcel

Implementation-ready design for the Team tier ($149/mo, 5 seats). Covers
organization model, invitations, RBAC, shared data, seat management, billing,
migration, branding, and API changes.

---

## 1. Organization Model

### Design Decision: Every Paying Account Is a Team

A Solo Pro subscriber is a team with `seat_limit=1`. A Team subscriber has
`seat_limit=5` (expandable). This eliminates two billing code paths and makes
upgrading from Solo Pro to Team a single field update + seat limit change.

The `Team` model is the **billing entity**. Stripe customer/subscription IDs
live on Team, not on User. This means the organization pays, not the individual.

### Extended Team Model

```python
# backend/models/teams.py

import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from database import Base
from models.base import TimestampMixin

TeamPlan = Enum("free", "starter", "pro", "team", name="teamplan")


class Team(TimestampMixin, Base):
    """An organization — the billing entity and data boundary for team features."""

    __tablename__ = "teams"

    # Identity
    name = Column(String(120), nullable=False)
    slug = Column(String(120), unique=True, nullable=False, index=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    # Billing — synchronized from Stripe via webhooks
    stripe_customer_id = Column(String(255), nullable=True, unique=True, index=True)
    stripe_subscription_id = Column(String(255), nullable=True, unique=True, index=True)
    plan = Column(TeamPlan, nullable=False, default="free", server_default="free")
    seat_limit = Column(Integer, nullable=False, default=1, server_default="1")

    # AI usage — shared pool across all team members
    ai_message_limit = Column(Integer, nullable=False, default=0, server_default="0")
    ai_messages_used = Column(Integer, nullable=False, default=0, server_default="0")
    ai_message_reset_at = Column(DateTime, nullable=True)

    # Custom branding (Team tier only)
    brand_logo_url = Column(String(500), nullable=True)
    brand_company_name = Column(String(200), nullable=True)
    brand_primary_color = Column(String(7), nullable=True)  # hex "#6366F1"

    # Soft delete
    deleted_at = Column(DateTime, nullable=True)

    # Relationships
    members = relationship("TeamMember", back_populates="team", cascade="all, delete-orphan")
    invitations = relationship("TeamInvitation", back_populates="team", cascade="all, delete-orphan")
    deals = relationship("Deal", back_populates="team", foreign_keys="Deal.team_id")
```

### Slug Generation

Slugs provide URL-friendly team identifiers for future use (e.g., `/team/acme-investments/pipeline`).
Generate on creation using `python-slugify`:

```python
from slugify import slugify

def generate_unique_slug(name: str, db: Session) -> str:
    base = slugify(name, max_length=100)
    slug = base
    counter = 1
    while db.query(Team).filter(Team.slug == slug, Team.deleted_at.is_(None)).first():
        slug = f"{base}-{counter}"
        counter += 1
    return slug
```

### User Model Additions

Two columns added to `users`:

```python
# Add to backend/models/users.py — User class

# Billing (denormalized from subscription for fast access)
stripe_customer_id = Column(String, unique=True, nullable=True, index=True)
plan_tier = Column(
    Enum("free", "starter", "pro", "team", name="plantier"),
    nullable=False,
    default="free",
    server_default="free",
)
```

`plan_tier` on User is a convenience cache. The canonical source is `Team.plan`.
Updated by webhook handlers. Used by `get_current_user` to embed tier in JWT
without a JOIN.

### Relationship Diagram

```
User (1) ──── (*) TeamMember (*) ──── (1) Team
  │                                       │
  │ user_id                               │ team_id
  ▼                                       ▼
Deal ◄──────────────────────────────────── ┘
PipelineEntry ◄─────────────────────────── ┘
PortfolioEntry ◄────────────────────────── ┘
Document ◄──────────────────────────────── ┘ (new FK)

ChatMessage ────── user_id only (no team_id, always private)
```

---

## 2. Invitation System

### TeamInvitation Model

```python
# backend/models/team_invitations.py

import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, Enum, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from database import Base
from models.base import TimestampMixin

InvitationStatus = Enum("pending", "accepted", "expired", "revoked", name="invitationstatus")
InviteRole = Enum("admin", "member", name="inviterole")


class TeamInvitation(TimestampMixin, Base):
    """A pending invitation for a user to join a team."""

    __tablename__ = "team_invitations"

    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id"), nullable=False, index=True)
    email = Column(String(255), nullable=False, index=True)
    role = Column(InviteRole, nullable=False, default="member")
    invited_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    token_hash = Column(String(64), nullable=False, unique=True, index=True)  # SHA-256
    status = Column(InvitationStatus, nullable=False, default="pending")
    expires_at = Column(DateTime, nullable=False)
    accepted_at = Column(DateTime, nullable=True)

    # Relationships
    team = relationship("Team", back_populates="invitations")
    inviter = relationship("User", foreign_keys=[invited_by])
```

**Why hash the token?** The raw token is sent via email. If the DB is
compromised, the attacker cannot use stored hashes to accept invitations.
Same pattern as password reset tokens already in the codebase.

### Invitation Flow — Step by Step

```
1. Owner/Admin: POST /api/v1/teams/{team_id}/invitations  { email, role }

2. Backend validates:
   a. Caller has MANAGE_MEMBERS permission (Owner or Admin)
   b. Seat limit not exceeded: (current members + pending invites) < team.seat_limit
   c. Email not already a team member
   d. Email not already invited (pending)

3. Backend creates invitation:
   a. raw_token = secrets.token_urlsafe(32)
   b. token_hash = SHA-256(raw_token)
   c. Insert TeamInvitation(team_id, email, role, token_hash, expires_at=now+7d)

4. Backend sends email via Resend (same infra as password reset):
   Subject: "You've been invited to join {team.name} on Parcel"
   Body: CTA button → {FRONTEND_URL}/invite/{raw_token}

5. Invitee clicks link → frontend route /invite/:token
   a. If not authenticated → redirect to /register?invite={token}
   b. If authenticated → POST /api/v1/teams/invitations/{token}/accept

6. Backend accept:
   a. Hash the received token, look up TeamInvitation by token_hash
   b. Validate: status=pending, not expired, not revoked
   c. Re-check seat limit (race condition guard)
   d. Create TeamMember(team_id, user_id, role=invitation.role)
   e. Set user.team_id = team.id
   f. Mark invitation: status=accepted, accepted_at=now
   g. If team exceeds base 5 seats → call add_seat_to_subscription()
   h. Return team details

7. If invitee registers via /register?invite={token}:
   a. Normal registration flow completes first
   b. Then auto-accept the invitation (step 6)
```

### Invitation Endpoints

```python
# backend/routers/teams.py

import hashlib
import secrets
from datetime import datetime, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from core.security.jwt import get_current_user
from core.security.permissions import Permission, require_team_permission
from database import get_db
from models.team_invitations import TeamInvitation
from models.team_members import TeamMember
from models.teams import Team
from models.users import User
from schemas.teams import (
    InviteRequest,
    InviteResponse,
    InvitationListResponse,
    AcceptInviteResponse,
    TeamMemberResponse,
)

router = APIRouter(prefix="/teams", tags=["teams"])


@router.post("/{team_id}/invitations", response_model=InviteResponse, status_code=201)
async def invite_member(
    team_id: UUID,
    body: InviteRequest,
    current_user: User = Depends(require_team_permission(Permission.MANAGE_MEMBERS)),
    db: Session = Depends(get_db),
) -> InviteResponse:
    """Invite a user to join the team by email."""
    team = db.query(Team).filter(Team.id == team_id, Team.deleted_at.is_(None)).first()
    if not team:
        raise HTTPException(status_code=404, detail={"error": "Team not found", "code": "TEAM_NOT_FOUND"})

    # Already a member?
    existing_member = db.query(TeamMember).join(User).filter(
        TeamMember.team_id == team_id,
        User.email == body.email.lower(),
    ).first()
    if existing_member:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"error": "User is already a team member", "code": "ALREADY_MEMBER"},
        )

    # Seat limit check: members + pending invites
    member_count = db.query(func.count(TeamMember.id)).filter(
        TeamMember.team_id == team_id,
    ).scalar()
    pending_count = db.query(func.count(TeamInvitation.id)).filter(
        TeamInvitation.team_id == team_id,
        TeamInvitation.status == "pending",
    ).scalar()

    if member_count + pending_count >= team.seat_limit:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={
                "error": f"Seat limit reached ({team.seat_limit}). Add more seats to invite.",
                "code": "SEAT_LIMIT_REACHED",
                "seat_limit": team.seat_limit,
                "current_members": member_count,
                "pending_invites": pending_count,
                "upgrade_url": "/settings/billing",
            },
        )

    # Revoke any existing pending invitation for this email
    db.query(TeamInvitation).filter(
        TeamInvitation.team_id == team_id,
        TeamInvitation.email == body.email.lower(),
        TeamInvitation.status == "pending",
    ).update({"status": "revoked"})

    # Create invitation
    raw_token = secrets.token_urlsafe(32)
    invitation = TeamInvitation(
        team_id=team_id,
        email=body.email.lower(),
        role=body.role or "member",
        invited_by=current_user.id,
        token_hash=hashlib.sha256(raw_token.encode()).hexdigest(),
        expires_at=datetime.utcnow() + timedelta(days=7),
    )
    db.add(invitation)
    db.commit()

    # Send email (fire-and-forget, reuse Resend infra from password reset)
    # send_team_invitation_email(body.email, team.name, raw_token, current_user.name)

    return InviteResponse(
        message="Invitation sent",
        email=body.email.lower(),
        role=invitation.role,
        expires_at=invitation.expires_at,
    )


@router.get("/{team_id}/invitations", response_model=InvitationListResponse)
async def list_invitations(
    team_id: UUID,
    current_user: User = Depends(require_team_permission(Permission.MANAGE_MEMBERS)),
    db: Session = Depends(get_db),
) -> InvitationListResponse:
    """List pending invitations for the team."""
    invitations = db.query(TeamInvitation).filter(
        TeamInvitation.team_id == team_id,
        TeamInvitation.status == "pending",
    ).order_by(TeamInvitation.created_at.desc()).all()

    return InvitationListResponse(invitations=invitations)


@router.post("/invitations/{token}/accept", response_model=AcceptInviteResponse)
async def accept_invitation(
    token: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AcceptInviteResponse:
    """Accept a team invitation using the raw token from the email link."""
    token_hash = hashlib.sha256(token.encode()).hexdigest()

    invitation = db.query(TeamInvitation).filter(
        TeamInvitation.token_hash == token_hash,
        TeamInvitation.status == "pending",
    ).first()

    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "Invitation not found or already used", "code": "INVITE_NOT_FOUND"},
        )

    if invitation.expires_at < datetime.utcnow():
        invitation.status = "expired"
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail={"error": "Invitation has expired", "code": "INVITE_EXPIRED"},
        )

    # Email must match (case-insensitive)
    if current_user.email.lower() != invitation.email.lower():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "This invitation was sent to a different email", "code": "EMAIL_MISMATCH"},
        )

    # User already in a team?
    if current_user.team_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "error": "You are already a member of a team. Leave your current team first.",
                "code": "ALREADY_IN_TEAM",
            },
        )

    team = db.query(Team).filter(Team.id == invitation.team_id, Team.deleted_at.is_(None)).first()
    if not team:
        raise HTTPException(status_code=404, detail={"error": "Team no longer exists", "code": "TEAM_NOT_FOUND"})

    # Re-check seat limit (race condition guard)
    member_count = db.query(func.count(TeamMember.id)).filter(
        TeamMember.team_id == team.id,
    ).scalar()
    if member_count >= team.seat_limit:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={"error": "Team is full. The owner must add more seats.", "code": "SEAT_LIMIT_REACHED"},
        )

    # Create membership
    membership = TeamMember(
        team_id=team.id,
        user_id=current_user.id,
        role=invitation.role,
    )
    db.add(membership)

    # Set user's active team
    current_user.team_id = team.id

    # Mark invitation accepted
    invitation.status = "accepted"
    invitation.accepted_at = datetime.utcnow()

    db.commit()

    # If new member count > 5, add extra seat to Stripe subscription
    new_count = member_count + 1
    if new_count > 5 and team.stripe_subscription_id:
        await add_seat_to_subscription(team, new_count)

    return AcceptInviteResponse(
        team_id=team.id,
        team_name=team.name,
        role=invitation.role,
    )


@router.delete("/{team_id}/invitations/{invitation_id}", status_code=204)
async def revoke_invitation(
    team_id: UUID,
    invitation_id: UUID,
    current_user: User = Depends(require_team_permission(Permission.MANAGE_MEMBERS)),
    db: Session = Depends(get_db),
) -> None:
    """Revoke a pending invitation."""
    invitation = db.query(TeamInvitation).filter(
        TeamInvitation.id == invitation_id,
        TeamInvitation.team_id == team_id,
        TeamInvitation.status == "pending",
    ).first()
    if not invitation:
        raise HTTPException(status_code=404, detail={"error": "Invitation not found", "code": "INVITE_NOT_FOUND"})

    invitation.status = "revoked"
    db.commit()
```

### Pydantic Schemas for Invitations

```python
# backend/schemas/teams.py (relevant additions)

from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, EmailStr


class InviteRequest(BaseModel):
    email: EmailStr
    role: Optional[str] = "member"  # "admin" | "member"


class InviteResponse(BaseModel):
    message: str
    email: str
    role: str
    expires_at: datetime


class InvitationListItem(BaseModel):
    id: UUID
    email: str
    role: str
    invited_by: UUID
    status: str
    expires_at: datetime
    created_at: datetime

    model_config = {"from_attributes": True}


class InvitationListResponse(BaseModel):
    invitations: list[InvitationListItem]


class AcceptInviteResponse(BaseModel):
    team_id: UUID
    team_name: str
    role: str
```

---

## 3. Role Model — Permission Matrix

### Role Definitions

```python
# backend/models/team_members.py — updated enum

TeamMemberRole = Enum("owner", "admin", "member", name="teammemberrole")
```

**Migration from old roles:** `analyst` → `admin`, `viewer` → `member`. Alembic
migration renames enum values in PostgreSQL:

```python
def upgrade() -> None:
    op.execute("ALTER TYPE teammemberrole RENAME VALUE 'analyst' TO 'admin'")
    op.execute("ALTER TYPE teammemberrole RENAME VALUE 'viewer' TO 'member'")

def downgrade() -> None:
    op.execute("ALTER TYPE teammemberrole RENAME VALUE 'admin' TO 'analyst'")
    op.execute("ALTER TYPE teammemberrole RENAME VALUE 'member' TO 'viewer'")
```

### Complete Permission Matrix

| Action                        | Owner | Admin | Member |
|-------------------------------|:-----:|:-----:|:------:|
| **View team dashboard**       |  yes  |  yes  |  yes   |
| **View all team deals**       |  yes  |  yes  |  yes   |
| **Create deals** (assigned to team) |  yes  |  yes  |  yes   |
| **Edit own deals**            |  yes  |  yes  |  yes   |
| **Edit any team deal**        |  yes  |  yes  |   no   |
| **Delete any team deal**      |  yes  |  yes  |   no   |
| **View team pipeline**        |  yes  |  yes  |  yes   |
| **Add deals to pipeline**     |  yes  |  yes  |  yes   |
| **Move cards on pipeline**    |  yes  |  yes  |  yes   |
| **Remove any pipeline card**  |  yes  |  yes  |   no   |
| **View team portfolio**       |  yes  |  yes  |  yes   |
| **Add portfolio entries**     |  yes  |  yes  |  yes   |
| **Edit any portfolio entry**  |  yes  |  yes  |   no   |
| **View team documents**       |  yes  |  yes  |  yes   |
| **Upload documents** (assigned to team) |  yes  |  yes  |  yes   |
| **Delete any team document**  |  yes  |  yes  |   no   |
| **Use AI chat** (shared pool) |  yes  |  yes  |  yes   |
| **View other members' chat**  |   no  |   no  |   no   |
| **Generate offer letters**    |  yes  |  yes  |  yes   |
| **Export PDF reports**        |  yes  |  yes  |  yes   |
| **Share deals externally**    |  yes  |  yes  |  yes   |
| **Invite members**            |  yes  |  yes  |   no   |
| **Remove members**            |  yes  |  yes  |   no   |
| **Change member roles**       |  yes  |   no  |   no   |
| **View billing info**         |  yes  |  view |   no   |
| **Manage billing/payment**    |  yes  |   no  |   no   |
| **Configure custom branding** |  yes  |  yes  |   no   |
| **Add/remove seats**          |  yes  |   no  |   no   |
| **Transfer ownership**        |  yes  |   no  |   no   |
| **Delete team**               |  yes  |   no  |   no   |

### Permission System Implementation

```python
# backend/core/security/permissions.py

from enum import Enum
from uuid import UUID

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from core.security.jwt import get_current_user
from database import get_db
from models.team_members import TeamMember
from models.users import User


class Permission(str, Enum):
    VIEW_TEAM = "view_team"
    CREATE_DEALS = "create_deals"
    MANAGE_ANY_DEAL = "manage_any_deal"         # Edit/delete ANY team deal
    MANAGE_PIPELINE = "manage_pipeline"          # Remove any card
    MANAGE_PORTFOLIO = "manage_portfolio"        # Edit any entry
    MANAGE_DOCUMENTS = "manage_documents"        # Delete any document
    MANAGE_MEMBERS = "manage_members"            # Invite, remove
    CHANGE_ROLES = "change_roles"
    MANAGE_BILLING = "manage_billing"            # Stripe portal, plan changes
    VIEW_BILLING = "view_billing"                # View invoice history
    MANAGE_BRANDING = "manage_branding"          # Logo, colors
    MANAGE_SEATS = "manage_seats"
    TRANSFER_OWNERSHIP = "transfer_ownership"
    DELETE_TEAM = "delete_team"


ROLE_PERMISSIONS: dict[str, set[Permission]] = {
    "owner": {
        Permission.VIEW_TEAM,
        Permission.CREATE_DEALS,
        Permission.MANAGE_ANY_DEAL,
        Permission.MANAGE_PIPELINE,
        Permission.MANAGE_PORTFOLIO,
        Permission.MANAGE_DOCUMENTS,
        Permission.MANAGE_MEMBERS,
        Permission.CHANGE_ROLES,
        Permission.MANAGE_BILLING,
        Permission.VIEW_BILLING,
        Permission.MANAGE_BRANDING,
        Permission.MANAGE_SEATS,
        Permission.TRANSFER_OWNERSHIP,
        Permission.DELETE_TEAM,
    },
    "admin": {
        Permission.VIEW_TEAM,
        Permission.CREATE_DEALS,
        Permission.MANAGE_ANY_DEAL,
        Permission.MANAGE_PIPELINE,
        Permission.MANAGE_PORTFOLIO,
        Permission.MANAGE_DOCUMENTS,
        Permission.MANAGE_MEMBERS,
        Permission.VIEW_BILLING,
        Permission.MANAGE_BRANDING,
    },
    "member": {
        Permission.VIEW_TEAM,
        Permission.CREATE_DEALS,
    },
}


def get_team_membership(
    current_user: User,
    db: Session,
) -> TeamMember | None:
    """Return the user's membership in their active team, or None."""
    if not current_user.team_id:
        return None
    return db.query(TeamMember).filter(
        TeamMember.user_id == current_user.id,
        TeamMember.team_id == current_user.team_id,
    ).first()


def require_team_permission(permission: Permission):
    """FastAPI dependency: checks that the current user has the given
    permission in their active team.

    Raises 403 if the user has no team, is not a member, or lacks the permission.
    """
    def _dependency(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> User:
        if not current_user.team_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"error": "No active team", "code": "NO_TEAM"},
            )

        membership = get_team_membership(current_user, db)
        if not membership:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"error": "Not a team member", "code": "NOT_MEMBER"},
            )

        role_perms = ROLE_PERMISSIONS.get(membership.role, set())
        if permission not in role_perms:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": "Insufficient permissions",
                    "code": "INSUFFICIENT_PERMISSIONS",
                    "required": permission.value,
                    "your_role": membership.role,
                },
            )

        return current_user
    return _dependency


def has_permission(role: str, permission: Permission) -> bool:
    """Pure function for checking permissions outside of FastAPI dependencies."""
    return permission in ROLE_PERMISSIONS.get(role, set())
```

### Ownership Guard for Mutating Other People's Data

Members can create and edit their own data. Only Owner/Admin can edit
any team deal. This requires a secondary check beyond the basic query filter:

```python
# backend/core/security/data_access.py (addition)

def can_mutate_resource(
    resource_user_id: UUID,
    current_user: User,
    membership: TeamMember | None,
) -> bool:
    """Return True if the current user may edit/delete this resource.

    Rules:
    - Owner of the resource: always allowed
    - Team Owner or Admin: allowed for any team resource
    - Team Member: only their own resources
    - Solo user: only their own resources
    """
    if resource_user_id == current_user.id:
        return True

    if membership and membership.role in ("owner", "admin"):
        return True

    return False
```

---

## 4. Shared Data Model — Org-Scoped vs User-Scoped

### Data Visibility Rules

| Entity            | Solo User         | Team Member                                    |
|-------------------|-------------------|------------------------------------------------|
| **Deals**         | Own only          | Own + all where `team_id = user.team_id`       |
| **Pipeline**      | Own only          | Shared board — all entries with matching `team_id` |
| **Portfolio**     | Own only          | Team portfolio — aggregated across members     |
| **Documents**     | Own only          | Own + all where `team_id = user.team_id`       |
| **Dashboard**     | Own stats         | Team-aggregated stats                          |
| **AI Chat**       | Own only          | **PRIVATE** — always `user_id` only, no `team_id` |
| **Settings**      | Personal          | Personal + team settings                       |

### Why Chat Stays Private

AI chat sessions contain exploratory thinking, half-formed ideas, and sensitive
negotiation questions. Making these visible to the team creates a chilling
effect on usage. The AI message quota is shared across the team, but
individual chat history is never visible to other team members.

`chat_messages` intentionally has no `team_id` column.

### Centralized Query Filter: `visible_to_user()`

This is the single most important function in the team architecture. Every
data query in every router must use it.

```python
# backend/core/security/data_access.py

from sqlalchemy import or_, and_, true
from models.users import User


def visible_to_user(model, current_user: User):
    """Return a SQLAlchemy filter clause for data visible to the current user.

    For team members: own data + data where team_id matches the user's active team.
    For solo users: own data only.

    Assumes the model has user_id. If the model has deleted_at, excludes
    soft-deleted rows. If the model has team_id, includes team data for
    team members.
    """
    has_deleted_at = hasattr(model, "deleted_at")
    has_team_id = hasattr(model, "team_id")
    soft_delete_filter = model.deleted_at.is_(None) if has_deleted_at else true()

    if current_user.team_id and has_team_id:
        ownership = or_(
            model.user_id == current_user.id,
            model.team_id == current_user.team_id,
        )
    else:
        ownership = (model.user_id == current_user.id)

    return and_(ownership, soft_delete_filter)


def _get_accessible_deal(deal_id, current_user: User, db) -> "Deal":
    """Fetch a deal that the current user can view.

    Raises 404 if not found, 403 if not accessible.
    """
    from models.deals import Deal

    deal = db.query(Deal).filter(Deal.id == deal_id, Deal.deleted_at.is_(None)).first()
    if not deal:
        raise HTTPException(
            status_code=404,
            detail={"error": "Deal not found", "code": "DEAL_NOT_FOUND"},
        )

    is_owner = deal.user_id == current_user.id
    is_team_member = (
        current_user.team_id is not None
        and deal.team_id is not None
        and deal.team_id == current_user.team_id
    )

    if not is_owner and not is_team_member:
        raise HTTPException(
            status_code=403,
            detail={"error": "Access denied", "code": "ACCESS_DENIED"},
        )

    return deal
```

### Document Model: Add `team_id`

Documents currently lack a `team_id` FK. This must be added:

```python
# backend/models/documents.py — add column

team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id"), nullable=True, index=True)
```

Alembic migration:

```python
def upgrade() -> None:
    op.add_column("documents", sa.Column(
        "team_id", sa.dialects.postgresql.UUID(as_uuid=True),
        sa.ForeignKey("teams.id"), nullable=True,
    ))
    op.create_index("ix_documents_team_id", "documents", ["team_id"])

def downgrade() -> None:
    op.drop_index("ix_documents_team_id", table_name="documents")
    op.drop_column("documents", "team_id")
```

### Auto-Assignment of `team_id` on Creation

When a team member creates any entity (deal, pipeline entry, portfolio entry,
document), `team_id` is automatically set:

```python
# In deals router — create_deal:
deal = Deal(
    user_id=current_user.id,
    team_id=current_user.team_id,  # None for solo, UUID for team member
    ...
)

# Same pattern in pipeline, portfolio, documents routers
```

**Currently broken in deals.py:** `team_id=None` is hard-coded. Must change to
`team_id=current_user.team_id`.

---

## 5. Seat Management

### Pricing Model

- Team base: $149/month (includes 5 seats)
- Extra seats: $29/month per seat beyond 5
- Stripe configuration: two line items on a single subscription

### Adding a Seat (Beyond Base 5)

Triggered when a new member joins and total exceeds 5:

```python
# backend/core/billing/seats.py

import stripe
from models.teams import Team
from core.config import settings


async def add_seat_to_subscription(team: Team, new_member_count: int) -> None:
    """Increment the extra-seat line item on the Stripe subscription.

    Called after a new member is successfully added. Only modifies Stripe
    if the team exceeds the base 5 seats.
    """
    extra_seats_needed = max(0, new_member_count - 5)
    if extra_seats_needed == 0 or not team.stripe_subscription_id:
        return

    subscription = stripe.Subscription.retrieve(team.stripe_subscription_id)

    # Find existing extra-seat line item
    seat_item = next(
        (item for item in subscription["items"]["data"]
         if item["price"]["id"] == settings.STRIPE_EXTRA_SEAT_PRICE_ID),
        None,
    )

    if seat_item:
        stripe.SubscriptionItem.modify(
            seat_item["id"],
            quantity=extra_seats_needed,
            proration_behavior="create_prorations",
        )
    else:
        stripe.SubscriptionItem.create(
            subscription=team.stripe_subscription_id,
            price=settings.STRIPE_EXTRA_SEAT_PRICE_ID,
            quantity=extra_seats_needed,
            proration_behavior="create_prorations",
        )


async def remove_seat_from_subscription(team: Team, new_member_count: int) -> None:
    """Decrement or remove the extra-seat line item when a member leaves.

    Stripe applies a prorated credit to the next invoice.
    """
    extra_seats_needed = max(0, new_member_count - 5)
    if not team.stripe_subscription_id:
        return

    subscription = stripe.Subscription.retrieve(team.stripe_subscription_id)
    seat_item = next(
        (item for item in subscription["items"]["data"]
         if item["price"]["id"] == settings.STRIPE_EXTRA_SEAT_PRICE_ID),
        None,
    )

    if not seat_item:
        return

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

### Remove Member Endpoint

```python
@router.delete("/{team_id}/members/{user_id}", status_code=204)
async def remove_member(
    team_id: UUID,
    user_id: UUID,
    current_user: User = Depends(require_team_permission(Permission.MANAGE_MEMBERS)),
    db: Session = Depends(get_db),
) -> None:
    """Remove a member from the team. Owner cannot be removed (must transfer first)."""
    membership = db.query(TeamMember).filter(
        TeamMember.team_id == team_id,
        TeamMember.user_id == user_id,
    ).first()

    if not membership:
        raise HTTPException(status_code=404, detail={"error": "Member not found", "code": "MEMBER_NOT_FOUND"})

    if membership.role == "owner":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Cannot remove the team owner. Transfer ownership first.", "code": "CANNOT_REMOVE_OWNER"},
        )

    # Admin can only be removed by owner
    if membership.role == "admin":
        caller_membership = get_team_membership(current_user, db)
        if caller_membership.role != "owner":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"error": "Only the owner can remove admins", "code": "INSUFFICIENT_PERMISSIONS"},
            )

    # Clear user's team context
    removed_user = db.query(User).filter(User.id == user_id).first()
    if removed_user:
        removed_user.team_id = None

    db.delete(membership)
    db.commit()

    # Adjust Stripe seats
    new_count = db.query(func.count(TeamMember.id)).filter(
        TeamMember.team_id == team_id,
    ).scalar()
    team = db.query(Team).filter(Team.id == team_id).first()
    if team:
        await remove_seat_from_subscription(team, new_count)
```

### Proration Behavior

- **Adding a seat mid-cycle:** customer is charged a prorated amount for
  remaining days in the current billing period. Stripe handles this
  automatically with `proration_behavior="create_prorations"`.
- **Removing a seat mid-cycle:** a prorated credit is applied to the next
  invoice. No refund issued; credit reduces the next charge.

---

## 6. Team Onboarding Flow

### Step-by-Step: Owner Creates Organization

```
1. User on Solo Pro clicks "Upgrade to Team" in billing settings
2. Frontend redirects to Stripe Checkout with metadata:
   { "team_id": user.team_id, "plan": "team", "seat_limit": "5" }
   (If user has no team yet, create one first via POST /api/v1/teams)

3. Stripe Checkout completes → checkout.session.completed webhook fires
4. Backend webhook handler:
   a. Look up team by metadata.team_id
   b. Set team.plan = "team", team.seat_limit = 5
   c. Set team.stripe_customer_id, team.stripe_subscription_id
   d. Set team.ai_message_limit = 500
   e. Update user.plan_tier = "team"
   f. Commit

5. User returns to /settings/team (new page)
6. Team settings page shows:
   a. Team name (editable)
   b. "Invite Members" section — email input + role picker + send button
   c. Pending invitations list
   d. Current members list with role badges
   e. Branding section (logo upload, company name, accent color)

7. Owner invites teammates via email
8. Invitees receive email, click link, register/login, join team
9. All team data (deals, pipeline, portfolio, documents) is now shared
```

### Team Creation Endpoint

```python
@router.post("/", response_model=TeamResponse, status_code=201)
async def create_team(
    body: TeamCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TeamResponse:
    """Create a new team with the current user as owner.

    Used when a solo user initiates the Team plan upgrade flow.
    """
    if current_user.team_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"error": "You are already in a team", "code": "ALREADY_IN_TEAM"},
        )

    slug = generate_unique_slug(body.name, db)

    team = Team(
        name=body.name,
        slug=slug,
        created_by=current_user.id,
        plan="free",       # Upgraded to "team" by Stripe webhook after payment
        seat_limit=1,
    )
    db.add(team)
    db.flush()

    membership = TeamMember(
        team_id=team.id,
        user_id=current_user.id,
        role="owner",
    )
    db.add(membership)

    current_user.team_id = team.id
    db.commit()
    db.refresh(team)

    return TeamResponse.model_validate(team)
```

---

## 7. Data Visibility Rules

### Detailed Visibility for Each Entity

**Deals:**
- Solo user sees only `Deal.user_id == self.id`
- Team member sees `Deal.user_id == self.id OR Deal.team_id == self.team_id`
- Team member creating a deal: `team_id` auto-set to `user.team_id`
- Member can edit their own deals. Owner/Admin can edit any team deal.
- Delete: Owner/Admin can soft-delete any team deal. Member only their own.

**Pipeline:**
- Solo user sees entries where `PipelineEntry.user_id == self.id`
- Team member sees all entries where `PipelineEntry.team_id == self.team_id`
- The pipeline board is a **single shared board** for the team
- Any team member can add deals to pipeline and move cards between stages
- Only Owner/Admin can remove another member's pipeline entry

**Portfolio:**
- Solo user sees entries where `PortfolioEntry.user_id == self.id`
- Team member sees all entries where `PortfolioEntry.team_id == self.team_id`
- Summary aggregates (total equity, total cash flow, total profit) are computed
  across all team entries
- Any team member can add portfolio entries
- Only Owner/Admin can edit another member's entries

**Documents:**
- Solo user sees documents where `Document.user_id == self.id`
- Team member sees documents where `Document.user_id == self.id OR Document.team_id == self.team_id`
- Any team member can upload documents (auto-assigned to team)
- Only Owner/Admin can delete another member's documents

**AI Chat:**
- Always `ChatMessage.user_id == self.id` — never shared
- AI message quota is pooled at the team level (`team.ai_messages_used`)
- Each member's usage contributes to the shared pool

**Dashboard:**
- Solo user: stats from own data only
- Team member: stats aggregated from all team data
- Activity feed shows team-wide activity (new deals by any member, pipeline moves, etc.)
- Team members are identified by first name in the activity feed

### Dashboard Team-Aware Queries

```python
# backend/routers/dashboard.py — updated for team awareness

@router.get("/stats/", response_model=DashboardStatsResponse)
def get_dashboard_stats(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DashboardStatsResponse:
    # Build ownership filter using the centralized helper
    from core.security.data_access import visible_to_user

    deal_filter = visible_to_user(Deal, current_user)

    total_deals: int = db.execute(
        select(func.count()).select_from(Deal).where(deal_filter)
    ).scalar_one()

    # Pipeline: filter by team_id if in a team
    if current_user.team_id:
        pipe_filter = PipelineEntry.team_id == current_user.team_id
    else:
        pipe_filter = PipelineEntry.user_id == current_user.id

    # ... same pattern for portfolio, documents
```

---

## 8. Billing Architecture

### Billing Rules

1. **The Team (organization) is the billing entity.** Stripe customer ID and
   subscription ID live on `teams`, not `users`.

2. **One owner per team.** The owner is the billing contact. Only the owner
   can access the Stripe billing portal (manage payment method, view invoices,
   cancel subscription).

3. **Admins can view billing info** (invoice history, current plan, seat count)
   but cannot modify payment methods or cancel.

4. **Members see nothing billing-related.** No billing tab in their settings.

5. **Ownership transfer updates the Stripe customer email** to the new
   owner's email address.

### Stripe Billing Portal

```python
@router.post("/{team_id}/billing-portal")
async def create_billing_portal_session(
    team_id: UUID,
    current_user: User = Depends(require_team_permission(Permission.MANAGE_BILLING)),
    db: Session = Depends(get_db),
):
    """Create a Stripe Billing Portal session for the team owner."""
    team = db.query(Team).filter(Team.id == team_id, Team.deleted_at.is_(None)).first()
    if not team or not team.stripe_customer_id:
        raise HTTPException(
            status_code=400,
            detail={"error": "No billing account configured", "code": "NO_BILLING"},
        )

    session = stripe.billing_portal.Session.create(
        customer=team.stripe_customer_id,
        return_url=f"{settings.FRONTEND_URL}/settings/billing",
    )
    return {"url": session.url}
```

### Billing Info Endpoint (View-Only for Admins)

```python
@router.get("/{team_id}/billing")
async def get_billing_info(
    team_id: UUID,
    current_user: User = Depends(require_team_permission(Permission.VIEW_BILLING)),
    db: Session = Depends(get_db),
):
    """Return current billing status — plan, seats used, AI usage, period dates."""
    team = db.query(Team).filter(Team.id == team_id, Team.deleted_at.is_(None)).first()
    if not team:
        raise HTTPException(status_code=404, detail={"error": "Team not found", "code": "TEAM_NOT_FOUND"})

    member_count = db.query(func.count(TeamMember.id)).filter(
        TeamMember.team_id == team_id,
    ).scalar()

    return {
        "plan": team.plan,
        "seat_limit": team.seat_limit,
        "seats_used": member_count,
        "ai_messages_limit": team.ai_message_limit,
        "ai_messages_used": team.ai_messages_used,
        "ai_message_resets_at": team.ai_message_reset_at,
        "stripe_customer_id": team.stripe_customer_id if current_user.team_id else None,
    }
```

### Stripe Webhook Handler (Team-Aware)

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

    event_type = event["type"]
    data = event["data"]["object"]

    if event_type == "checkout.session.completed":
        team_id = data["metadata"].get("team_id")
        plan = data["metadata"].get("plan", "team")
        seat_limit = int(data["metadata"].get("seat_limit", "5"))

        team = db.query(Team).filter(Team.id == team_id).first()
        if team:
            team.stripe_customer_id = data["customer"]
            team.stripe_subscription_id = data["subscription"]
            team.plan = plan
            team.seat_limit = seat_limit
            team.ai_message_limit = _plan_ai_limits(plan)

            # Update the owner's plan_tier
            owner = db.query(User).filter(User.id == team.created_by).first()
            if owner:
                owner.plan_tier = plan

            db.commit()

    elif event_type == "invoice.payment_succeeded":
        subscription_id = data.get("subscription")
        team = db.query(Team).filter(
            Team.stripe_subscription_id == subscription_id
        ).first()
        if team:
            # Reset AI usage counter at each billing cycle
            team.ai_messages_used = 0
            from datetime import timedelta
            team.ai_message_reset_at = datetime.utcnow() + timedelta(days=30)
            db.commit()

    elif event_type == "customer.subscription.updated":
        subscription_id = data["id"]
        team = db.query(Team).filter(
            Team.stripe_subscription_id == subscription_id
        ).first()
        if team:
            # Sync seat count from Stripe
            for item in data.get("items", {}).get("data", []):
                if item["price"]["id"] == settings.STRIPE_TEAM_BASE_PRICE_ID:
                    pass  # base price, no quantity change
                elif item["price"]["id"] == settings.STRIPE_EXTRA_SEAT_PRICE_ID:
                    extra = item["quantity"]
                    team.seat_limit = 5 + extra
            db.commit()

    elif event_type == "customer.subscription.deleted":
        subscription_id = data["id"]
        team = db.query(Team).filter(
            Team.stripe_subscription_id == subscription_id
        ).first()
        if team:
            team.plan = "free"
            team.seat_limit = 1
            team.ai_message_limit = 0
            team.stripe_subscription_id = None
            # Notify non-owner members (handled by background task)
            db.commit()

    elif event_type == "invoice.payment_failed":
        subscription_id = data.get("subscription")
        team = db.query(Team).filter(
            Team.stripe_subscription_id == subscription_id
        ).first()
        if team:
            # Set grace period flag; send email to owner
            pass

    return {"status": "ok"}


def _plan_ai_limits(plan: str) -> int:
    return {"free": 0, "starter": 30, "pro": 150, "team": 500}.get(plan, 0)
```

---

## 9. Migration: Solo User Upgrades to Team

### Scenario

A user on Solo Pro ($49/mo) upgrades to Team ($149/mo). Their existing deals,
pipeline entries, portfolio entries, and documents must be preserved and become
visible to future team members.

### Migration Function

```python
# backend/core/billing/team_migration.py

from datetime import datetime
from uuid import UUID

from sqlalchemy.orm import Session

from models.deals import Deal
from models.documents import Document
from models.pipeline_entries import PipelineEntry
from models.portfolio_entries import PortfolioEntry
from models.team_members import TeamMember
from models.teams import Team
from models.users import User


def migrate_solo_to_team(
    user: User,
    team_name: str,
    db: Session,
) -> Team:
    """Upgrade a solo user to a team owner, migrating all existing data.

    This is called BEFORE the Stripe checkout redirect. The Team is created
    in "free" plan state; it is upgraded to "team" by the Stripe webhook
    after payment succeeds.

    Steps:
    1. Create Team record
    2. Add user as Owner in TeamMember
    3. Set user.team_id
    4. Migrate all existing deals (set team_id)
    5. Migrate pipeline entries
    6. Migrate portfolio entries
    7. Migrate documents
    """
    from core.security.data_access import generate_unique_slug

    # 1. Create team
    team = Team(
        name=team_name,
        slug=generate_unique_slug(team_name, db),
        created_by=user.id,
        plan="free",     # Upgraded by webhook
        seat_limit=1,    # Upgraded by webhook
    )
    db.add(team)
    db.flush()  # Get team.id

    # 2. Owner membership
    db.add(TeamMember(
        team_id=team.id,
        user_id=user.id,
        role="owner",
    ))

    # 3. Set active team
    user.team_id = team.id

    # 4. Migrate deals
    db.query(Deal).filter(
        Deal.user_id == user.id,
        Deal.deleted_at.is_(None),
        Deal.team_id.is_(None),
    ).update({"team_id": team.id}, synchronize_session="fetch")

    # 5. Migrate pipeline entries
    db.query(PipelineEntry).filter(
        PipelineEntry.user_id == user.id,
        PipelineEntry.team_id.is_(None),
    ).update({"team_id": team.id}, synchronize_session="fetch")

    # 6. Migrate portfolio entries
    db.query(PortfolioEntry).filter(
        PortfolioEntry.user_id == user.id,
        PortfolioEntry.team_id.is_(None),
    ).update({"team_id": team.id}, synchronize_session="fetch")

    # 7. Migrate documents
    db.query(Document).filter(
        Document.user_id == user.id,
        Document.team_id.is_(None),
    ).update({"team_id": team.id}, synchronize_session="fetch")

    db.commit()
    return team
```

### Downgrade: Team to Solo

When a Team subscription is canceled:

```python
def downgrade_team_to_solo(team: Team, db: Session) -> None:
    """Handle Team subscription cancellation.

    1. Notify non-owner members via email
    2. Remove all non-owner TeamMember rows
    3. Clear team_id on removed users
    4. Reset team to free plan
    5. Data stays intact — owner retains access to everything
    """
    # Get all non-owner members
    non_owners = db.query(TeamMember).filter(
        TeamMember.team_id == team.id,
        TeamMember.role != "owner",
    ).all()

    for membership in non_owners:
        user = db.query(User).filter(User.id == membership.user_id).first()
        if user:
            user.team_id = None
            user.plan_tier = "free"
            # TODO: send_team_removal_email(user.email, team.name)
        db.delete(membership)

    team.plan = "free"
    team.seat_limit = 1
    team.ai_message_limit = 0
    team.ai_messages_used = 0

    db.commit()
```

**What happens to deals created by removed members?**
- Deals created by removed members retain `user_id` of the creator AND
  `team_id` of the team. The owner can still see them (via `team_id` match).
- The removed member can no longer see team deals (their `team_id` is cleared).
- The removed member's own solo deals (created before joining) were migrated
  with `team_id` set. After removal, they can only access deals where
  `user_id` matches. Deals they created while on the team have their `user_id`,
  so they retain access to those specific deals.

---

## 10. Custom Branding

### What Gets Branded (Team Tier Only)

1. **PDF deal reports** — logo replaces Parcel logo, company name replaces
   "Parcel", accent color replaces indigo
2. **Shared deal pages** (`/share/{deal_id}`) — team branding if deal has
   `team_id`
3. **Offer letter emails** — team branding in header

### Branding Data on Team Model

Already defined in the Team model above:
- `brand_logo_url` — S3 URL for uploaded logo (max 2MB, PNG/SVG/JPEG)
- `brand_company_name` — displayed in place of "Parcel"
- `brand_primary_color` — hex color replacing `#6366F1` (indigo)

### Backend Endpoints

```python
# GET /api/v1/teams/{team_id}/branding
# PUT /api/v1/teams/{team_id}/branding (requires MANAGE_BRANDING)
# POST /api/v1/teams/{team_id}/branding/logo (multipart upload, requires MANAGE_BRANDING)

@router.get("/{team_id}/branding")
async def get_team_branding(
    team_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return branding config. Any team member can read; falls back to Parcel defaults."""
    team = db.query(Team).filter(Team.id == team_id, Team.deleted_at.is_(None)).first()
    if not team:
        raise HTTPException(status_code=404, detail={"error": "Team not found", "code": "TEAM_NOT_FOUND"})

    # Verify user is in this team
    if current_user.team_id != team.id:
        raise HTTPException(status_code=403, detail={"error": "Access denied", "code": "ACCESS_DENIED"})

    return {
        "logo_url": team.brand_logo_url,
        "company_name": team.brand_company_name or "Parcel",
        "primary_color": team.brand_primary_color or "#6366F1",
    }


@router.put("/{team_id}/branding")
async def update_team_branding(
    team_id: UUID,
    body: BrandingUpdateRequest,
    current_user: User = Depends(require_team_permission(Permission.MANAGE_BRANDING)),
    db: Session = Depends(get_db),
):
    """Update team branding. Requires MANAGE_BRANDING (Owner or Admin)."""
    team = db.query(Team).filter(Team.id == team_id, Team.deleted_at.is_(None)).first()
    if not team:
        raise HTTPException(status_code=404, detail={"error": "Team not found", "code": "TEAM_NOT_FOUND"})

    # Verify team is on Team plan
    if team.plan != "team":
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={
                "error": "Custom branding requires the Team plan",
                "code": "FEATURE_GATED",
                "feature": "custom_branding",
                "upgrade_url": "/settings/billing",
            },
        )

    if body.company_name is not None:
        team.brand_company_name = body.company_name
    if body.primary_color is not None:
        # Validate hex color format
        if not body.primary_color.startswith("#") or len(body.primary_color) != 7:
            raise HTTPException(status_code=400, detail={"error": "Invalid hex color", "code": "INVALID_COLOR"})
        team.brand_primary_color = body.primary_color

    team.updated_at = datetime.utcnow()
    db.commit()
    return {"status": "updated"}
```

### Frontend PDF Integration

```typescript
// frontend/src/lib/pdf-report.ts — branding parameter

interface BrandConfig {
  logoUrl: string | null;
  companyName: string;          // default: "Parcel"
  primaryColor: [number, number, number];  // RGB, default: [99, 102, 241]
  headerBg: [number, number, number];      // RGB, default: [8, 8, 15]
}

const DEFAULT_BRAND: BrandConfig = {
  logoUrl: null,
  companyName: "Parcel",
  primaryColor: [99, 102, 241],   // indigo
  headerBg: [8, 8, 15],          // DARK_HEADER
};

// Updated function signature:
export function generateDealReport(
  deal: DealResponse,
  brand: BrandConfig = DEFAULT_BRAND,
): jsPDF {
  // Use brand.primaryColor where INDIGO was used
  // Use brand.companyName where "Parcel" was used
  // If brand.logoUrl provided, fetch and embed image
  // Otherwise use the default Parcel logo
  ...
}
```

---

## 11. API Changes — Every Endpoint Needs Team Context

### Summary of Router Changes

Every router that queries user-owned data must be updated to use
`visible_to_user()` instead of direct `user_id` filters.

#### `routers/deals.py`

| Endpoint | Current Filter | New Filter | Additional Logic |
|---|---|---|---|
| `POST /deals/` | `team_id=None` | `team_id=current_user.team_id` | Auto-assign team |
| `GET /deals/` | `user_id == current_user.id` | `visible_to_user(Deal, current_user)` | Team sees all |
| `GET /deals/{id}` | `_get_owned_deal` (user_id check) | `_get_accessible_deal` (user_id OR team_id) | — |
| `PUT /deals/{id}` | `_get_owned_deal` | `_get_accessible_deal` + `can_mutate_resource` | Member: own only |
| `DELETE /deals/{id}` | `_get_owned_deal` | `_get_accessible_deal` + `can_mutate_resource` | Member: own only |
| `PUT /deals/{id}/share/` | `_get_owned_deal` | `_get_accessible_deal` | Any team member can share |
| `POST /deals/{id}/offer-letter/` | `_get_owned_deal` | `_get_accessible_deal` | Any team member |

**Implementation for `list_deals`:**

```python
@router.get("/", response_model=list[DealListItem])
async def list_deals(
    request: Request,
    strategy: Optional[str] = Query(None),
    deal_status: Optional[str] = Query(None, alias="status"),
    zip_code: Optional[str] = Query(None),
    search: Optional[str] = Query(None, alias="q"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    sort: str = Query("created_at_desc"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[DealListItem]:
    from core.security.data_access import visible_to_user

    q = db.query(Deal).filter(visible_to_user(Deal, current_user))
    # ... rest of filters unchanged
```

**Implementation for `create_deal` — fix team_id:**

```python
deal = Deal(
    user_id=current_user.id,
    team_id=current_user.team_id,   # was: team_id=None
    ...
)
```

**Implementation for mutation endpoints:**

```python
@router.put("/{deal_id}", response_model=DealResponse)
async def update_deal(
    deal_id: UUID,
    body: DealUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DealResponse:
    from core.security.data_access import _get_accessible_deal, can_mutate_resource
    from core.security.permissions import get_team_membership

    deal = _get_accessible_deal(deal_id, current_user, db)

    # Permission check for editing someone else's deal
    if deal.user_id != current_user.id:
        membership = get_team_membership(current_user, db)
        if not can_mutate_resource(deal.user_id, current_user, membership):
            raise HTTPException(
                status_code=403,
                detail={"error": "Members can only edit their own deals", "code": "INSUFFICIENT_PERMISSIONS"},
            )

    # ... rest unchanged
```

#### `routers/pipeline.py`

| Endpoint | Current Filter | New Filter |
|---|---|---|
| `GET /pipeline/` | `PipelineEntry.user_id == current_user.id` | `PipelineEntry.team_id == current_user.team_id` (if team) OR `PipelineEntry.user_id == current_user.id` (solo) |
| `POST /pipeline/` | `Deal.user_id == current_user.id` | `visible_to_user(Deal, current_user)` for deal access; `team_id=current_user.team_id` on new entry |
| `PUT /pipeline/{id}/stage/` | `PipelineEntry.user_id == current_user.id` | Team: any entry with matching team_id. Solo: own only. |
| `DELETE /pipeline/{id}/` | `PipelineEntry.user_id == current_user.id` | Team Owner/Admin: any. Member: own only. |

**Implementation for `get_pipeline_board`:**

```python
@router.get("/", response_model=PipelineBoardResponse)
async def get_pipeline_board(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PipelineBoardResponse:
    if current_user.team_id:
        ownership_filter = PipelineEntry.team_id == current_user.team_id
    else:
        ownership_filter = PipelineEntry.user_id == current_user.id

    entries = (
        db.query(PipelineEntry, Deal)
        .join(Deal, PipelineEntry.deal_id == Deal.id)
        .filter(ownership_filter, Deal.deleted_at.is_(None))
        .all()
    )
    # ... rest unchanged
```

#### `routers/portfolio.py`

| Endpoint | Current Filter | New Filter |
|---|---|---|
| `GET /portfolio/` | `PortfolioEntry.user_id == current_user.id` | `visible_to_user(PortfolioEntry, current_user)` |
| `POST /portfolio/` | `Deal.user_id == current_user.id` | `visible_to_user(Deal, current_user)` for deal access |
| `PUT /portfolio/{id}/` | `PortfolioEntry.user_id == current_user.id` | Team-aware + `can_mutate_resource` check |

#### `routers/dashboard.py`

All four data queries (deals, pipeline, portfolio, documents) must switch from
`Model.user_id == current_user.id` to `visible_to_user(Model, current_user)`.

#### `routers/chat.py`

**No changes to data visibility.** Chat remains strictly user-scoped. However,
AI message quota must check the shared team pool:

```python
# Before streaming a response:
from core.billing.ai_usage import check_ai_quota, increment_ai_usage

check_ai_quota(current_user, db)  # Raises 402 if pool exhausted
# ... stream response ...
increment_ai_usage(current_user, db)  # Decrement from shared pool
```

#### New Router: `routers/teams.py`

New endpoints required:

```
POST   /api/v1/teams                              Create team (becomes owner)
GET    /api/v1/teams/{id}                          Get team details
PUT    /api/v1/teams/{id}                          Update team name
DELETE /api/v1/teams/{id}                          Soft-delete team (owner only)

GET    /api/v1/teams/{id}/members                  List members
DELETE /api/v1/teams/{id}/members/{user_id}        Remove member
PUT    /api/v1/teams/{id}/members/{user_id}/role   Change role (owner only)

POST   /api/v1/teams/{id}/invitations              Invite by email
GET    /api/v1/teams/{id}/invitations              List pending invitations
DELETE /api/v1/teams/{id}/invitations/{inv_id}     Revoke invitation
POST   /api/v1/teams/invitations/{token}/accept    Accept invitation

GET    /api/v1/teams/{id}/branding                 Get branding config
PUT    /api/v1/teams/{id}/branding                 Update branding
POST   /api/v1/teams/{id}/branding/logo            Upload logo

GET    /api/v1/teams/{id}/billing                  Get billing info (view)
POST   /api/v1/teams/{id}/billing-portal           Create Stripe portal session

POST   /api/v1/teams/{id}/transfer-ownership       Transfer to another admin
```

### JWT Enhancement: Embed Team Context

Add `team_id` and `plan_tier` to the JWT payload so team context is available
without a DB query on every request:

```python
# backend/core/security/jwt.py — updated create_access_token call

def create_access_token(data: dict, expires_delta=None) -> str:
    # data already includes {"sub": user_id}
    # Callers should also include:
    #   "team_id": str(user.team_id) if user.team_id else None,
    #   "tier": user.plan_tier,
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode["exp"] = expire
    to_encode["type"] = "access"
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
```

Token issuance sites (login, register, refresh) must include `team_id` and
`tier` in the payload. When `get_current_user` decodes the token, these claims
are available without a JOIN.

**Staleness tradeoff:** Team context in JWT can be up to 15 minutes stale.
Acceptable because:
- Team membership changes are rare events
- The 15-minute access token is already refreshed on each cycle
- For critical operations (billing, invitations), the endpoint re-queries
  the DB regardless

---

## 12. AI Usage: Shared Pool Enforcement

### Architecture: Team-Level Counter, Not Per-User

The Team tier includes 500 AI messages per billing cycle, shared across all
members. This is the correct model because:

1. Predictable cost for the owner — no per-seat quota to manage
2. Simple implementation — one counter on the Team row
3. Avoids penalizing power users while wasting quota on light users

### Implementation

```python
# backend/core/billing/ai_usage.py

from datetime import datetime
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from models.teams import Team
from models.users import User


def check_ai_quota(current_user: User, db: Session) -> None:
    """Raise 402 if the user's team has exhausted its AI message quota.

    For solo users: checks the personal team-of-one.
    For team members: checks the shared team pool.
    """
    team = _get_billing_team(current_user, db)
    if not team:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={"error": "No active plan", "code": "NO_PLAN"},
        )

    if team.ai_message_limit == 0:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={
                "error": "AI chat is not included in your plan",
                "code": "FEATURE_GATED",
                "feature": "ai_chat",
                "upgrade_url": "/settings/billing",
            },
        )

    if team.ai_messages_used >= team.ai_message_limit:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={
                "error": "AI message limit reached for this billing cycle",
                "code": "QUOTA_EXCEEDED",
                "resource": "ai_messages",
                "limit": team.ai_message_limit,
                "current_usage": team.ai_messages_used,
                "resets_at": team.ai_message_reset_at.isoformat() if team.ai_message_reset_at else None,
                "upgrade_url": "/settings/billing",
            },
        )


def increment_ai_usage(current_user: User, db: Session) -> int:
    """Increment the AI message counter after a successful response.

    Returns the new usage count.
    """
    team = _get_billing_team(current_user, db)
    if team:
        team.ai_messages_used = Team.ai_messages_used + 1
        db.commit()
        db.refresh(team)
        return team.ai_messages_used
    return 0


def get_ai_usage_status(current_user: User, db: Session) -> dict:
    """Return current AI usage for display in the frontend."""
    team = _get_billing_team(current_user, db)
    if not team:
        return {"used": 0, "limit": 0, "resets_at": None}
    return {
        "used": team.ai_messages_used,
        "limit": team.ai_message_limit,
        "resets_at": team.ai_message_reset_at.isoformat() if team.ai_message_reset_at else None,
    }


def _get_billing_team(current_user: User, db: Session) -> Team | None:
    """Resolve the billing team for a user.

    Team members: their active team.
    Solo users: the team they own (team-of-one).
    """
    if current_user.team_id:
        return db.query(Team).filter(Team.id == current_user.team_id).first()
    # Solo user: find their team-of-one
    return db.query(Team).filter(
        Team.created_by == current_user.id,
        Team.deleted_at.is_(None),
    ).first()
```

---

## Alembic Migration Plan

### Migration 1: Extend Team model, add Document.team_id

```python
"""extend team model for billing, add team_id to documents

Revision ID: [generated]
"""

def upgrade() -> None:
    # --- Enums ---
    teamplan = sa.Enum("free", "starter", "pro", "team", name="teamplan")
    teamplan.create(op.get_bind(), checkfirst=True)

    invitationstatus = sa.Enum("pending", "accepted", "expired", "revoked", name="invitationstatus")
    invitationstatus.create(op.get_bind(), checkfirst=True)

    inviterole = sa.Enum("admin", "member", name="inviterole")
    inviterole.create(op.get_bind(), checkfirst=True)

    plantier = sa.Enum("free", "starter", "pro", "team", name="plantier")
    plantier.create(op.get_bind(), checkfirst=True)

    # --- Teams table: add billing + branding columns ---
    op.add_column("teams", sa.Column("slug", sa.String(120), nullable=True))
    op.add_column("teams", sa.Column("stripe_customer_id", sa.String(255), nullable=True))
    op.add_column("teams", sa.Column("stripe_subscription_id", sa.String(255), nullable=True))
    op.add_column("teams", sa.Column("plan", teamplan, nullable=False, server_default="free"))
    op.add_column("teams", sa.Column("seat_limit", sa.Integer, nullable=False, server_default="1"))
    op.add_column("teams", sa.Column("ai_message_limit", sa.Integer, nullable=False, server_default="0"))
    op.add_column("teams", sa.Column("ai_messages_used", sa.Integer, nullable=False, server_default="0"))
    op.add_column("teams", sa.Column("ai_message_reset_at", sa.DateTime, nullable=True))
    op.add_column("teams", sa.Column("brand_logo_url", sa.String(500), nullable=True))
    op.add_column("teams", sa.Column("brand_company_name", sa.String(200), nullable=True))
    op.add_column("teams", sa.Column("brand_primary_color", sa.String(7), nullable=True))
    op.add_column("teams", sa.Column("deleted_at", sa.DateTime, nullable=True))

    op.create_unique_constraint("uq_teams_slug", "teams", ["slug"])
    op.create_index("ix_teams_slug", "teams", ["slug"])
    op.create_unique_constraint("uq_teams_stripe_customer_id", "teams", ["stripe_customer_id"])
    op.create_index("ix_teams_stripe_customer_id", "teams", ["stripe_customer_id"])
    op.create_unique_constraint("uq_teams_stripe_subscription_id", "teams", ["stripe_subscription_id"])
    op.create_index("ix_teams_stripe_subscription_id", "teams", ["stripe_subscription_id"])

    # Backfill slugs for existing teams
    op.execute("UPDATE teams SET slug = LOWER(REPLACE(name, ' ', '-')) WHERE slug IS NULL")
    op.alter_column("teams", "slug", nullable=False)

    # --- Users table: add billing columns ---
    op.add_column("users", sa.Column("stripe_customer_id", sa.String, nullable=True))
    op.add_column("users", sa.Column("plan_tier", plantier, nullable=False, server_default="free"))
    op.create_unique_constraint("uq_users_stripe_customer_id", "users", ["stripe_customer_id"])
    op.create_index("ix_users_stripe_customer_id", "users", ["stripe_customer_id"])

    # --- Documents table: add team_id ---
    op.add_column("documents", sa.Column(
        "team_id",
        sa.dialects.postgresql.UUID(as_uuid=True),
        sa.ForeignKey("teams.id"),
        nullable=True,
    ))
    op.create_index("ix_documents_team_id", "documents", ["team_id"])

    # --- Rename TeamMember roles ---
    op.execute("ALTER TYPE teammemberrole RENAME VALUE 'analyst' TO 'admin'")
    op.execute("ALTER TYPE teammemberrole RENAME VALUE 'viewer' TO 'member'")

    # --- Create team_invitations table ---
    op.create_table(
        "team_invitations",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("team_id", sa.dialects.postgresql.UUID(as_uuid=True),
                   sa.ForeignKey("teams.id"), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("role", inviterole, nullable=False, server_default="member"),
        sa.Column("invited_by", sa.dialects.postgresql.UUID(as_uuid=True),
                   sa.ForeignKey("users.id"), nullable=False),
        sa.Column("token_hash", sa.String(64), nullable=False),
        sa.Column("status", invitationstatus, nullable=False, server_default="pending"),
        sa.Column("expires_at", sa.DateTime, nullable=False),
        sa.Column("accepted_at", sa.DateTime, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )
    op.create_index("ix_team_invitations_team_id", "team_invitations", ["team_id"])
    op.create_index("ix_team_invitations_email", "team_invitations", ["email"])
    op.create_unique_constraint("uq_team_invitations_token_hash", "team_invitations", ["token_hash"])
    op.create_index("ix_team_invitations_token_hash", "team_invitations", ["token_hash"])
```

---

## CRITICAL DECISIONS

These are the architectural choices that constrain the entire implementation.
Changing any of them after launch requires significant migration work.

### 1. Team Is the Billing Entity, Not the User

The Stripe customer ID and subscription ID live on `teams`, not `users`. Even
Solo Pro users get a team-of-one. This means:
- One billing code path, not two
- Upgrading Solo → Team is a field update, not a data migration
- Downgrading Team → Solo removes members but preserves data
- **Trade-off:** Solo users have a somewhat invisible "team" abstraction.
  The frontend never shows team UI for solo users.

### 2. Chat History Is Always Private

AI chat messages have no `team_id`. Even within a team, User A cannot see
User B's chat history. The AI message *quota* is shared, but the *content*
is private.
- **Trade-off:** No "shared AI insights" feature. If a team wants to share
  an AI recommendation, they must copy/paste it manually or share the deal
  (which includes AI-generated context).
- **Rationale:** Privacy-by-default. Every competitor keeps chat private.
  Reversing this decision later (adding team_id to chat) is easy. Un-sharing
  already-shared chats is a legal liability.

### 3. `visible_to_user()` Is the Single Data Access Gate

All data queries go through `visible_to_user()`. No router should construct
its own ownership filters. This centralizes the multi-tenancy logic and makes
it auditable.
- **Trade-off:** Every router change must coordinate with this function.
  Developers cannot "just query" without the filter.
- **Enforcement:** Code review rule. Integration tests create two teams and
  assert zero cross-team data leakage.

### 4. Members See Everything in the Team (No Per-User Privacy)

When you join a team, all team deals, pipeline entries, portfolio entries, and
documents are visible to you. There is no concept of "private deals within
a team" at launch.
- **Trade-off:** A member who creates a speculative deal cannot hide it from
  their team. This is a product choice, not a technical limitation.
- **Future option:** Add a `visibility` column to Deal (`team` | `private`).
  Default to `team`. `private` deals are only visible to the creator. This
  is a future feature, not needed for launch.

### 5. One Active Team Per User

A user can only belong to one team at a time (`user.team_id` is singular).
Multi-team membership is not supported at launch.
- **Trade-off:** A consultant who works with multiple investment groups cannot
  simultaneously be in multiple teams. They must leave one to join another.
- **Rationale:** Multi-team support requires a team switcher UI, per-request
  team context headers, and changes to every query filter. It is 3-5x the
  complexity for a feature that < 5% of users would need at launch.
- **Future option:** Replace `user.team_id` with a `active_team_id` and allow
  multiple TeamMember rows. Add `X-Team-ID` request header for team context.

### 6. Owner Cannot Be Removed Without Transfer

The team owner cannot leave or be removed. Ownership must be explicitly
transferred to another admin first. If the owner wants to delete the team,
all members are removed and the team is soft-deleted.
- **Rationale:** The owner is the billing contact. Stripe customer email,
  payment methods, and invoice history are tied to the owner. Orphaning a
  team creates a billing mess.

### 7. Seat Limit Counts Members + Pending Invitations

The seat limit check uses `current_members + pending_invitations >= seat_limit`.
This prevents over-inviting: if a team with 4 members and 1 pending invite
has a seat_limit of 5, no more invitations can be sent until the pending one
is accepted, revoked, or expired.
- **Trade-off:** An expired invitation "blocks" a seat until it transitions
  to `expired` status. A background job should expire old invitations
  (cron: every hour, mark `expired` where `expires_at < now` and `status = pending`).

### 8. Stripe Webhooks Are the Only Way to Change Billing State

The local DB mirrors Stripe. Application code never transitions billing state
locally (no `team.plan = "team"` in response to a user click). All billing
state changes flow through webhooks: `checkout.session.completed`,
`customer.subscription.updated`, `customer.subscription.deleted`,
`invoice.payment_succeeded`, `invoice.payment_failed`.
- **Trade-off:** There is a delay (seconds to minutes) between Stripe
  processing and the local DB updating. During this window, the user's local
  state is stale.
- **Mitigation:** After Stripe Checkout redirects back, poll
  `GET /api/v1/teams/{id}/billing` until `plan` reflects the new tier (or
  timeout after 10 seconds and show "processing" message).

### 9. No Audit Log at Launch

Team actions (invite, remove member, role change, deal deletion) are not
logged in a dedicated audit table. This is a deliberate scope cut for launch.
- **Risk:** For teams with 5+ members, "who deleted deal X?" is unanswerable
  without audit logs. This becomes a support burden.
- **Mitigation:** Add an `audit_events` table in Phase 5 (post-launch).
  Schema: `(id, team_id, actor_id, action, target_type, target_id, metadata, created_at)`.

### 10. AI Usage Resets on Invoice Payment, Not Calendar Month

The `ai_messages_used` counter resets to 0 when `invoice.payment_succeeded`
fires, which aligns with the actual billing cycle. For teams that subscribed
on March 15, their AI quota resets on April 15, not April 1.
- **Rationale:** Billing-cycle-aligned resets are standard in SaaS. Calendar
  resets create confusion ("I paid on the 15th but lost my quota on the 1st?").
- **Implementation:** The webhook handler sets `ai_messages_used = 0` and
  `ai_message_reset_at = now + 30 days` on every `invoice.payment_succeeded`.
