import os


def otel_status():
    endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "")
    service = os.getenv("OTEL_SERVICE_NAME", "testops-platform")
    if endpoint:
        return {"enabled": True, "service": service, "endpoint": endpoint}
    return {"enabled": False, "service": service, "note": "Set OTEL_EXPORTER_OTLP_ENDPOINT to enable OTLP export"}
