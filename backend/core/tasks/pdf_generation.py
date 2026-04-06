"""Dramatiq actor for report PDF generation via Playwright."""

import logging
import os
import threading
from datetime import datetime

logger = logging.getLogger(__name__)

# Semaphore limits concurrent Playwright/Chromium instances to 1 to prevent OOM
_pdf_semaphore = threading.Semaphore(1)

try:
    import dramatiq
except ImportError:
    dramatiq = None


def _noop_send(*args, **kwargs):
    """Raise when Dramatiq is not available and a task is dispatched."""
    from core.tasks import WorkerUnavailableError
    raise WorkerUnavailableError("Background worker is not available. PDF generation requires Redis.")


if dramatiq:

    @dramatiq.actor(max_retries=2, min_backoff=15000)
    def generate_report_pdf(report_id: str) -> None:
        """Generate a PDF from the shared report page using Playwright.

        1. Load report from DB to get share_token
        2. Launch headless Chromium via Playwright
        3. Navigate to the shared report page URL
        4. Wait for charts/content to render
        5. Capture PDF with print settings
        6. Upload PDF to R2
        7. Update report record with pdf_s3_key
        """
        from database import SessionLocal
        from models.reports import Report
        from core.storage.s3_service import upload_file

        db = SessionLocal()
        try:
            report = db.query(Report).filter(Report.id == report_id).first()
            if not report:
                logger.error("Report %s not found", report_id)
                return

            if not report.share_token:
                logger.error("Report %s has no share_token", report_id)
                return

            frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
            page_url = f"{frontend_url}/reports/view/{report.share_token}"

            logger.info("Generating PDF for report %s at %s", report_id, page_url)

            from playwright.sync_api import sync_playwright

            _pdf_semaphore.acquire()
            try:
                with sync_playwright() as p:
                    browser = p.chromium.launch(headless=True)
                    page = browser.new_page(viewport={"width": 1024, "height": 1400})

                    page.goto(page_url, wait_until="networkidle")
                    # Wait for charts and animations to render
                    page.wait_for_timeout(3000)

                    # Verify we captured the report, not a login/auth redirect
                    page_text = page.text_content("body") or ""
                    if any(phrase in page_text for phrase in ("Sign in", "Log in", "Sign up to continue")):
                        browser.close()
                        logger.error(
                            "PDF generation for report %s captured a login page instead of the report. "
                            "Verify FRONTEND_URL and that /reports/view/* is a public route.",
                            report_id,
                        )
                        raise RuntimeError("PDF captured login page instead of report content")

                    pdf_bytes = page.pdf(
                        format="A4",
                        print_background=True,
                        margin={
                            "top": "0.5in",
                            "right": "0.5in",
                            "bottom": "0.75in",
                            "left": "0.5in",
                        },
                    )
                    browser.close()
            finally:
                _pdf_semaphore.release()

            # Upload to R2
            s3_key = f"reports/{report.id}/report.pdf"
            upload_file(pdf_bytes, s3_key, "application/pdf")

            # Update report record
            report.pdf_s3_key = s3_key
            report.pdf_generated_at = datetime.utcnow()
            db.commit()

            logger.info(
                "PDF generated for report %s: %d bytes, stored at %s",
                report_id, len(pdf_bytes), s3_key,
            )

        except Exception as e:
            logger.error("PDF generation failed for report %s: %s", report_id, e, exc_info=True)
            raise
        finally:
            db.close()

else:

    class _NoopActor:
        def __call__(self, *args, **kwargs):
            _noop_send(*args, **kwargs)

        def send(self, *args, **kwargs):
            _noop_send(*args, **kwargs)

    generate_report_pdf = _NoopActor()
