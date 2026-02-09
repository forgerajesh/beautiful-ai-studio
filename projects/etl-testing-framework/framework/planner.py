from typing import List
from .models import TestCase


def select_tests(all_tests: List[TestCase], include_tags=None, severities=None) -> List[TestCase]:
    include_tags = set(include_tags or [])
    severities = set(severities or [])

    selected = []
    for t in all_tests:
        if include_tags and not include_tags.intersection(set(t.tags)):
            continue
        if severities and t.severity not in severities:
            continue
        selected.append(t)
    return selected
