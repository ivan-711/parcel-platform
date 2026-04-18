# Tomorrow

Items deferred from current work for follow-up.

## Tech debt

- Replace `datetime.utcfromtimestamp` with `datetime.fromtimestamp(ts, tz=timezone.utc)` across backend/. Python 3.12+ deprecation. Deferred from the StripeObject boundary-conversion commit.
