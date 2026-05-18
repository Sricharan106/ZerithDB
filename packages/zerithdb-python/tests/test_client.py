"""Smoke tests for the ZerithDB Python SDK."""

import pytest
from zerithdb import ZerithClient


def test_client_instantiation():
    """ZerithClient should be instantiable with default arguments."""
    client = ZerithClient()
    assert client is not None
    assert client.signaling_url == "wss://arpitkhandelwal810-zerith-signaling.hf.space"
    assert client.peer_id is not None


def test_client_custom_url():
    """ZerithClient should accept a custom signaling URL."""
    client = ZerithClient(signaling_url="wss://example.com/signal")
    assert client.signaling_url == "wss://example.com/signal"


def test_db_state_initial():
    """Initial DB state should be an empty dict."""
    client = ZerithClient()
    assert client.db_state == {}


@pytest.mark.asyncio
async def test_insert_adds_to_state():
    """Inserting a record should add it to the in-memory state (without connecting)."""
    client = ZerithClient()

    # Manually stub the broadcast so we don't need a real connection
    async def _noop(msg):
        pass

    client.network.broadcast = _noop  # type: ignore[method-assign]

    await client.insert("users", {"id": "u1", "name": "Alice"})
    assert "users" in client.db_state
    assert client.db_state["users"]["u1"]["name"] == "Alice"
