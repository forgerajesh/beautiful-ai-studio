from abc import ABC, abstractmethod
from framework.models import Target, CheckSpec, Finding


class SecurityCheck(ABC):
    @abstractmethod
    def run(self, target: Target, spec: CheckSpec) -> Finding:
        raise NotImplementedError
