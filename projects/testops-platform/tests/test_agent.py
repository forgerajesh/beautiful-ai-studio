from app.agent.service import AgentService
from app.channels.base import ChannelMessage


def test_help_command():
    agent = AgentService(config_path="config/product.yaml")
    r = agent.handle(ChannelMessage(channel="telegram", user_id="u1", chat_id="c1", text="/help", raw={}))
    assert "Commands:" in r


def test_channels_command():
    agent = AgentService(config_path="config/product.yaml")
    r = agent.handle(ChannelMessage(channel="telegram", user_id="u1", chat_id="c1", text="/channels", raw={}))
    assert "telegram" in r and "whatsapp" in r
