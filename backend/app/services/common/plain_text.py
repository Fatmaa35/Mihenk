"""User comments are plain text, never executable HTML."""
from html.parser import HTMLParser


class _TextOnly(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []
        self.blocked = []

    def handle_starttag(self, tag, attrs):
        if tag in {"script", "style", "iframe", "object", "svg", "math", "template"}:
            self.blocked.append(tag)
        elif not self.blocked and tag in {"br", "p", "div", "li"}:
            self.parts.append("\n")

    def handle_endtag(self, tag):
        if self.blocked and tag == self.blocked[-1]:
            self.blocked.pop()

    def handle_data(self, data):
        if not self.blocked:
            self.parts.append(data)


def clean_comment(value: str) -> str:
    # Reparse decoded entities so nested encoded markup cannot reappear as HTML.
    for _ in range(8):
        parser = _TextOnly()
        parser.feed(value)
        parser.close()
        clean = "".join(parser.parts).replace("\x00", "").strip()
        if clean == value:
            return clean
        value = clean
    raise ValueError("Yorum çok katmanlı HTML içeriyor; lütfen düz metin kullanın.")
