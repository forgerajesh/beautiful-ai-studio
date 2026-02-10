from pathlib import Path
from xml.etree.ElementTree import Element, SubElement, ElementTree


def write_junit(findings, out_dir: str):
    p = Path(out_dir)
    p.mkdir(parents=True, exist_ok=True)
    tests = len(findings)
    failures = sum(1 for f in findings if f.status == "FAIL")
    errors = sum(1 for f in findings if f.status == "ERROR")

    suite = Element("testsuite", name="security-tests", tests=str(tests), failures=str(failures), errors=str(errors))
    for f in findings:
        tc = SubElement(suite, "testcase", classname=f.target_id, name=f.check_id)
        if f.status == "FAIL":
            node = SubElement(tc, "failure", message=f.summary)
            node.text = str(f.details)
        elif f.status == "ERROR":
            node = SubElement(tc, "error", message=f.summary)
            node.text = str(f.details)

    out = p / "security_junit.xml"
    ElementTree(suite).write(out, encoding="utf-8", xml_declaration=True)
    return str(out)
