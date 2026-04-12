#!/usr/bin/env python3
"""
kie_api.py — Thin wrapper around kie.ai API endpoints for the atmospheric
image pipeline.

Endpoints wrapped:
  1. File upload      POST  https://kieai.redpandaai.co/api/file-stream-upload
  2. Create task      POST  https://api.kie.ai/api/v1/jobs/createTask
  3. Poll task        GET   https://api.kie.ai/api/v1/jobs/recordInfo?taskId=

Models used:
  - nano-banana-pro          (Gemini 3 Pro image, supports image_input refs)
  - kling-3.0/video          (supports image_urls[0]=first, [1]=last for transitions)

Usage — as a module:
    from kie_api import (
        upload_file, create_nano_banana_task, create_kling_transition_task,
        poll_task, download_url, load_api_key,
    )

Usage — as a CLI:
    python scripts/kie_api.py upload <local_file> [--path images]
    python scripts/kie_api.py nano-banana "<prompt>" [--ref <url>] [--out <path>]
    python scripts/kie_api.py kling-transition <bright_url> <dark_url> "<prompt>" [--out <path>]
    python scripts/kie_api.py poll <taskId>

On task failure, the original prompt and parameters are appended to
scripts/failed-prompts.log so the user can retry manually.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.request
from pathlib import Path
from typing import Any

import requests

REPO_ROOT = Path(__file__).resolve().parent.parent
BACKEND_ENV = REPO_ROOT / "backend" / ".env"
FAILED_LOG = Path(__file__).resolve().parent / "failed-prompts.log"

BASE = "https://api.kie.ai/api/v1"
UPLOAD_URL = "https://kieai.redpandaai.co/api/file-stream-upload"
CREATE_URL = f"{BASE}/jobs/createTask"
POLL_URL = f"{BASE}/jobs/recordInfo"


# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------


def load_api_key() -> str:
    """Read KIE_API_KEY from backend/.env. Raises if missing."""
    if not BACKEND_ENV.exists():
        raise RuntimeError(f"Env file not found: {BACKEND_ENV}")
    for raw in BACKEND_ENV.read_text().splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("KIE_API_KEY="):
            value = line.split("=", 1)[1].strip().strip('"').strip("'")
            if value:
                return value
    raise RuntimeError(f"KIE_API_KEY not found in {BACKEND_ENV}")


def _headers(api_key: str | None = None) -> dict[str, str]:
    key = api_key or load_api_key()
    return {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }


def _log_failure(tag: str, payload: dict[str, Any], error: str) -> None:
    FAILED_LOG.parent.mkdir(parents=True, exist_ok=True)
    with FAILED_LOG.open("a") as fh:
        fh.write(f"\n--- {tag} {time.strftime('%Y-%m-%d %H:%M:%S')} ---\n")
        fh.write(f"ERROR: {error}\n")
        fh.write(f"PAYLOAD: {json.dumps(payload, indent=2)}\n")


# ---------------------------------------------------------------------------
# File upload
# ---------------------------------------------------------------------------


def upload_file(path: str | Path, upload_path: str = "images") -> str:
    """Upload a local file to kie.ai and return its public fileUrl."""
    p = Path(path)
    if not p.exists():
        raise FileNotFoundError(p)

    api_key = load_api_key()
    headers = {"Authorization": f"Bearer {api_key}"}

    with p.open("rb") as fh:
        files = {"file": (p.name, fh, "application/octet-stream")}
        data = {"uploadPath": upload_path, "fileName": p.name}
        resp = requests.post(UPLOAD_URL, headers=headers, files=files, data=data, timeout=300)

    if resp.status_code != 200:
        raise RuntimeError(
            f"Upload failed [{resp.status_code}]: {resp.text[:500]}"
        )
    body = resp.json()
    if not body.get("success") and body.get("code") != 200:
        raise RuntimeError(f"Upload failed: {body}")
    data = body.get("data", {})
    file_url = data.get("fileUrl") or data.get("downloadUrl")
    if not file_url:
        raise RuntimeError(f"Upload succeeded but no fileUrl: {body}")
    return file_url


# ---------------------------------------------------------------------------
# Task creation — Nano Banana Pro
# ---------------------------------------------------------------------------


def create_nano_banana_task(
    prompt: str,
    image_ref_urls: list[str] | None = None,
    aspect: str = "16:9",
    resolution: str = "4K",
    output_format: str = "png",
) -> str:
    """Create a Nano Banana Pro image generation task. Returns taskId."""
    payload: dict[str, Any] = {
        "model": "nano-banana-pro",
        "input": {
            "prompt": prompt,
            "aspect_ratio": aspect,
            "resolution": resolution,
            "output_format": output_format,
        },
    }
    if image_ref_urls:
        payload["input"]["image_input"] = image_ref_urls

    return _create_task(payload, tag="nano-banana-pro")


# ---------------------------------------------------------------------------
# Task creation — Kling 3.0 transition video
# ---------------------------------------------------------------------------


def create_kling_transition_task(
    first_frame_url: str,
    last_frame_url: str,
    prompt: str,
    duration: str = "3",
    mode: str = "pro",
    aspect: str = "16:9",
) -> str:
    """
    Create a Kling 3.0 image-to-video task with first+last frame transition.

    image_urls[0] = first frame, image_urls[1] = last frame.
    Minimum duration is 3 seconds (Kling 3.0 API constraint).
    """
    payload: dict[str, Any] = {
        "model": "kling-3.0/video",
        "input": {
            "prompt": prompt,
            "image_urls": [first_frame_url, last_frame_url],
            "duration": duration,
            "aspect_ratio": aspect,
            "mode": mode,
            "sound": False,
            "multi_shots": False,
            "multi_prompt": [],
            "kling_elements": [],
        },
    }
    return _create_task(payload, tag="kling-3.0/video")


def _create_task(payload: dict[str, Any], tag: str) -> str:
    """POST createTask and return taskId. One retry on 429."""
    headers = _headers()
    for attempt in range(2):
        resp = requests.post(CREATE_URL, headers=headers, json=payload, timeout=60)
        if resp.status_code == 429 and attempt == 0:
            print(f"[{tag}] rate limited, sleeping 10s...", file=sys.stderr)
            time.sleep(10)
            continue
        if resp.status_code != 200:
            error = f"createTask [{resp.status_code}]: {resp.text[:500]}"
            _log_failure(tag, payload, error)
            raise RuntimeError(error)
        body = resp.json()
        if body.get("code") != 200:
            error = f"createTask rejected: {body.get('msg')} | {body}"
            _log_failure(tag, payload, error)
            raise RuntimeError(error)
        data = body.get("data", {})
        task_id = data.get("taskId")
        if not task_id:
            error = f"createTask success but no taskId: {body}"
            _log_failure(tag, payload, error)
            raise RuntimeError(error)
        return task_id
    raise RuntimeError(f"[{tag}] createTask retries exhausted")


# ---------------------------------------------------------------------------
# Task polling
# ---------------------------------------------------------------------------


def poll_task(
    task_id: str,
    timeout_sec: int = 900,
    poll_interval: float = 5.0,
) -> dict[str, Any]:
    """
    Block until the task succeeds or fails.

    Returns the full `data` dict from the response, with `resultUrls`
    added as a parsed list (from `resultJson`). On failure, raises
    RuntimeError with failCode + failMsg.
    """
    headers = {"Authorization": f"Bearer {load_api_key()}"}
    started = time.time()
    last_state: str | None = None

    while True:
        elapsed = time.time() - started
        if elapsed > timeout_sec:
            raise RuntimeError(
                f"Task {task_id} timed out after {timeout_sec}s (last state: {last_state})"
            )

        resp = requests.get(
            POLL_URL, headers=headers, params={"taskId": task_id}, timeout=30
        )
        if resp.status_code != 200:
            raise RuntimeError(
                f"poll [{resp.status_code}]: {resp.text[:500]}"
            )
        body = resp.json()
        if body.get("code") != 200:
            raise RuntimeError(f"poll rejected: {body}")
        data = body.get("data", {}) or {}
        state = data.get("state") or data.get("status") or "unknown"
        if state != last_state:
            print(
                f"[{task_id}] state={state} elapsed={elapsed:.0f}s",
                file=sys.stderr,
            )
            last_state = state

        if state == "success":
            result_json_raw = data.get("resultJson") or "{}"
            try:
                result_parsed = json.loads(result_json_raw) if isinstance(result_json_raw, str) else result_json_raw
            except json.JSONDecodeError:
                result_parsed = {}
            data["resultUrls"] = result_parsed.get("resultUrls", [])
            return data
        if state == "fail":
            fail_code = data.get("failCode") or ""
            fail_msg = data.get("failMsg") or "(no message)"
            _log_failure(
                "poll-failure",
                {"taskId": task_id, "data": data},
                f"{fail_code}: {fail_msg}",
            )
            raise RuntimeError(f"Task {task_id} failed: {fail_code} — {fail_msg}")

        time.sleep(poll_interval)


# ---------------------------------------------------------------------------
# Download helper
# ---------------------------------------------------------------------------


def download_url(url: str, out_path: str | Path) -> None:
    """Stream a URL to disk, creating parent dirs as needed.

    Uses requests with a browser-like User-Agent — some kie.ai result CDNs
    (e.g. tempfile.aiquickdraw.com) reject the default urllib UA with 403.
    """
    out = Path(out_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36"
        ),
        "Accept": "*/*",
    }
    with requests.get(url, headers=headers, stream=True, timeout=300) as resp:
        resp.raise_for_status()
        with out.open("wb") as fh:
            for chunk in resp.iter_content(chunk_size=65536):
                if chunk:
                    fh.write(chunk)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def _cli() -> int:
    parser = argparse.ArgumentParser(
        description="kie.ai API helper for the atmospheric image pipeline"
    )
    sub = parser.add_subparsers(dest="cmd", required=True)

    up = sub.add_parser("upload", help="Upload a local file")
    up.add_argument("path")
    up.add_argument("--upload-path", default="images")

    nb = sub.add_parser("nano-banana", help="Create a Nano Banana Pro task")
    nb.add_argument("prompt")
    nb.add_argument("--ref", action="append", default=[], help="Reference image URL (repeatable)")
    nb.add_argument("--out", default=None, help="Download output PNG to this path after polling")
    nb.add_argument("--aspect", default="16:9")
    nb.add_argument("--resolution", default="4K")

    kl = sub.add_parser("kling-transition", help="Create a Kling 3.0 first-last transition video")
    kl.add_argument("first_url")
    kl.add_argument("last_url")
    kl.add_argument("prompt")
    kl.add_argument("--duration", default="3")
    kl.add_argument("--mode", default="pro")
    kl.add_argument("--out", default=None, help="Download output MP4 to this path after polling")

    pl = sub.add_parser("poll", help="Poll a taskId until success/fail")
    pl.add_argument("task_id")

    args = parser.parse_args()

    if args.cmd == "upload":
        url = upload_file(args.path, args.upload_path)
        print(url)
        return 0

    if args.cmd == "nano-banana":
        task_id = create_nano_banana_task(
            args.prompt,
            image_ref_urls=args.ref or None,
            aspect=args.aspect,
            resolution=args.resolution,
        )
        print(f"taskId={task_id}", file=sys.stderr)
        data = poll_task(task_id)
        urls = data.get("resultUrls") or []
        if not urls:
            print(f"FAIL: no resultUrls in {data}", file=sys.stderr)
            return 2
        print(urls[0])
        if args.out:
            download_url(urls[0], args.out)
            print(f"downloaded to {args.out}", file=sys.stderr)
        return 0

    if args.cmd == "kling-transition":
        task_id = create_kling_transition_task(
            args.first_url,
            args.last_url,
            args.prompt,
            duration=args.duration,
            mode=args.mode,
        )
        print(f"taskId={task_id}", file=sys.stderr)
        data = poll_task(task_id)
        urls = data.get("resultUrls") or []
        if not urls:
            print(f"FAIL: no resultUrls in {data}", file=sys.stderr)
            return 2
        print(urls[0])
        if args.out:
            download_url(urls[0], args.out)
            print(f"downloaded to {args.out}", file=sys.stderr)
        return 0

    if args.cmd == "poll":
        data = poll_task(args.task_id)
        print(json.dumps(data, indent=2))
        return 0

    return 1


if __name__ == "__main__":
    sys.exit(_cli())
