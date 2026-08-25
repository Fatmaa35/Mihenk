"""Production delivery adapters for reading reminders."""

from __future__ import annotations

from email.message import EmailMessage
import json
import smtplib
import ssl


class SMTPDelivery:
    def __init__(self, host: str, port: int, username: str, password: str,
                 from_email: str, starttls: bool = True) -> None:
        self.host, self.port = host, port
        self.username, self.password = username, password
        self.from_email, self.starttls = from_email, starttls

    def send(self, recipient: str, subject: str, body: str) -> None:
        message = EmailMessage()
        message["From"], message["To"], message["Subject"] = self.from_email, recipient, subject
        message.set_content(body)
        with smtplib.SMTP(self.host, self.port, timeout=15) as client:
            if self.starttls:
                client.starttls(context=ssl.create_default_context())
            if self.username:
                client.login(self.username, self.password)
            client.send_message(message)


class WebPushDelivery:
    def __init__(self, private_key: str, subject: str) -> None:
        self.private_key, self.subject = private_key, subject

    def send(self, subscription: dict, title: str, body: str, url: str = "/") -> None:
        from pywebpush import webpush

        webpush(
            subscription_info={
                "endpoint": subscription["endpoint"],
                "keys": {"p256dh": subscription["p256dh"], "auth": subscription["auth"]},
            },
            data=json.dumps({"title": title, "body": body, "url": url}, ensure_ascii=False),
            vapid_private_key=self.private_key,
            vapid_claims={"sub": self.subject},
            ttl=3600,
            timeout=15,
        )
