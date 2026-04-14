"""Re-export all models so Alembic can discover them via Base.metadata."""

from models.users import User
from models.teams import Team
from models.team_members import TeamMember
from models.deals import Deal
from models.pipeline_entries import PipelineEntry
from models.documents import Document
from models.chat_messages import ChatMessage
from models.portfolio_entries import PortfolioEntry
from models.subscriptions import Subscription
from models.usage_records import UsageRecord
from models.webhook_events import WebhookEvent

# Wave 0 models
from models.properties import Property
from models.analysis_scenarios import AnalysisScenario
from models.contacts import Contact
from models.tasks import Task
from models.communications import Communication
from models.transactions import Transaction
from models.reports import Report
from models.data_source_events import DataSourceEvent
from models.import_jobs import ImportJob
from models.deal_contacts import DealContact
from models.document_chunks import DocumentChunk
from models.report_views import ReportView

# Wave 2 models
from models.financing_instruments import FinancingInstrument
from models.obligations import Obligation
from models.payments import Payment

# Wave 3 models
from models.rehab_projects import RehabProject, RehabItem

# Wave 4 models
from models.buy_boxes import BuyBox
from models.buyer_packets import BuyerPacket, BuyerPacketSend
from models.sequences import Sequence, SequenceStep, SequenceEnrollment

# Wave 5 — Skip Tracing
from models.skip_traces import SkipTrace

# Wave 6 — Direct Mail
from models.mail_campaigns import MailCampaign, MailRecipient

__all__ = [
    "User",
    "Team",
    "TeamMember",
    "Deal",
    "PipelineEntry",
    "Document",
    "ChatMessage",
    "PortfolioEntry",
    "Subscription",
    "UsageRecord",
    "WebhookEvent",
    # Wave 0
    "Property",
    "AnalysisScenario",
    "Contact",
    "Task",
    "Communication",
    "Transaction",
    "Report",
    "DataSourceEvent",
    "ImportJob",
    "DealContact",
    "DocumentChunk",
    "ReportView",
    # Wave 2
    "FinancingInstrument",
    "Obligation",
    "Payment",
    # Wave 3
    "RehabProject",
    "RehabItem",
    # Wave 4
    "BuyBox",
    "BuyerPacket",
    "BuyerPacketSend",
    # Wave 5
    "Sequence",
    "SequenceStep",
    "SequenceEnrollment",
    # Wave 5 — Skip Tracing
    "SkipTrace",
    # Wave 6 — Direct Mail
    "MailCampaign",
    "MailRecipient",
]
