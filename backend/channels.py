"""
Outward notification channels (SMS, WhatsApp, Email).

A channel is how an alert reaches a person. Each one owns the DEFAULT WORDING
used for that channel; a rule can still carry its own message, which takes
priority (see notifier.dispatch). Stakeholders choose which channels reach
them (their own `channels` list holds the address).

Delivery today:
  sms       really sent through Ideabiz when SMS_ENABLED=true and IDEABIZ_TOKEN is set
  whatsapp  simulated — logged and recorded, nothing is delivered
  email     simulated — logged and recorded, nothing is delivered
`delivery()` reports this honestly so the UI never claims a channel is live when
it is not.
"""

import os
import string

import data_store

# Placeholders available in any message. `sample` is only used for the preview.
VARIABLES = [
    {"name": "severity",    "description": "CRITICAL, HIGH, MEDIUM or LOW",         "sample": "CRITICAL"},
    {"name": "object_type", "description": "What was detected",                      "sample": "elephant"},
    {"name": "zone_name",   "description": "The zone the detection is in",           "sample": "B43 Yala Road Corridor"},
    {"name": "device_name", "description": "The device that made the detection",     "sample": "Camera B43-02"},
    {"name": "confidence",  "description": "Detection confidence, 0 to 100",         "sample": "91"},
    {"name": "road",        "description": "The road of the zone, if set",           "sample": "B43"},
    {"name": "map_link",    "description": "Link to the detection on a map",         "sample": "https://maps.google.com/?q=6.38,81.40"},
    {"name": "incident_id", "description": "The incident reference",                 "sample": "INC-4F2A91"},
]
_VARIABLE_NAMES = {v["name"] for v in VARIABLES}

# Used when neither the rule nor the channel has any wording.
FALLBACK_WORDING = (
    "Alert [{severity}]: {object_type} detected in {zone_name} by {device_name}. "
    "Confidence: {confidence}%. Location: {map_link} Incident: {incident_id}"
)

DEFAULT_CHANNELS = [
    {
        "id": "sms", "type": "sms", "name": "SMS", "enabled": True,
        "template": "[{severity}] {object_type} near {zone_name}. Confidence {confidence}%. "
                    "{map_link} Incident {incident_id}",
    },
    {
        "id": "whatsapp", "type": "whatsapp", "name": "WhatsApp", "enabled": True,
        "template": "[{severity}] {object_type} detected in {zone_name} by {device_name}. "
                    "Confidence {confidence}%. Location: {map_link} Incident {incident_id}",
    },
    {
        "id": "email", "type": "email", "name": "Email", "enabled": True,
        "template": "A {severity} alert was raised: {object_type} detected in {zone_name} "
                    "by {device_name} (confidence {confidence}%).\n\n"
                    "Location: {map_link}\nIncident: {incident_id}",
    },
]


def ensure() -> None:
    """Create any missing channel with its default wording. Never overwrites an
    existing channel, so edits made in the UI survive a restart."""
    for ch in DEFAULT_CHANNELS:
        if not data_store.get_by_id("channels", ch["id"]):
            data_store.create("channels", dict(ch))


def get_by_type(ch_type: str) -> dict | None:
    return data_store.get_by_id("channels", str(ch_type or "").lower())


def wording_for(ch_type: str) -> str | None:
    """The channel's default wording, or None if it has none."""
    ch = get_by_type(ch_type)
    text = (ch or {}).get("template")
    return text if isinstance(text, str) and text.strip() else None


def is_enabled(ch_type: str) -> bool:
    ch = get_by_type(ch_type)
    return True if ch is None else bool(ch.get("enabled", True))


def delivery(ch_type: str) -> dict:
    """How messages on this channel are actually handled right now."""
    if ch_type == "sms":
        enabled = os.environ.get("SMS_ENABLED", "false").strip().lower() == "true"
        has_token = bool(os.environ.get("IDEABIZ_TOKEN", "").strip())
        if enabled and has_token:
            return {"mode": "live", "detail": "Sent through Ideabiz."}
        why = []
        if not enabled:
            why.append("SMS_ENABLED is not true")
        if not has_token:
            why.append("IDEABIZ_TOKEN is not set")
        return {"mode": "simulated",
                "detail": "Not sending real SMS: " + " and ".join(why) + ". Messages are logged and recorded only."}
    return {"mode": "simulated",
            "detail": "No provider is connected yet. Messages are logged and recorded, not delivered."}


def validate_wording(text) -> str | None:
    """None if the wording is usable, else a short reason. Placeholders must be
    ones the platform fills in; a stray brace would break the message."""
    if not isinstance(text, str) or not text.strip():
        return "Wording can't be empty."
    if len(text) > 1000:
        return "Wording is too long (limit 1000 characters)."
    try:
        fields = [f for _, f, _, _ in string.Formatter().parse(text) if f is not None]
    except ValueError as e:
        return f"Unbalanced braces: {e}. Write placeholders like {{zone_name}}."
    # Exact names only — no attribute/index access like {zone_name.__class__}.
    unknown = sorted({f for f in fields if f not in _VARIABLE_NAMES})
    if unknown:
        return "Unknown placeholder: " + ", ".join("{" + u + "}" for u in unknown)
    return None
