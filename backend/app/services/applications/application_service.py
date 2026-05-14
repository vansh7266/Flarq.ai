"""Application CRUD and Kanban helpers — all persistence via MongoMCPClient."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any, Literal

from bson import ObjectId
from bson.errors import InvalidId

from app.services.mongodb.mcp_client import MongoMCPClient, utcnow

APPLICATION_STATUSES: list[str] = [
    "saved",
    "applied",
    "phone_screen",
    "interview",
    "offer",
    "accepted",
    "rejected",
    "ghosted",
]


def _normalize_status(raw: str | None) -> str:
    if not raw:
        return "saved"
    if raw == "interviewing":
        return "interview"
    if raw == "withdrawn":
        return "saved"
    if raw in APPLICATION_STATUSES:
        return raw
    return "saved"


def _company(doc: dict[str, Any]) -> str:
    return str(doc.get("company_name") or doc.get("company") or "")


def _title(doc: dict[str, Any]) -> str:
    return str(doc.get("job_title") or doc.get("role_title") or "")


def _jd_id(doc: dict[str, Any]) -> str | None:
    v = doc.get("jd_id") or doc.get("job_description_id")
    return str(v) if v else None


def _notes_list(doc: dict[str, Any]) -> list[dict[str, Any]]:
    n = doc.get("notes")
    if n is None:
        return []
    if isinstance(n, str):
        return [{"text": n, "created_at": doc.get("created_at", utcnow()).isoformat()}]
    if isinstance(n, list):
        out: list[dict[str, Any]] = []
        for item in n:
            if isinstance(item, dict) and "text" in item:
                out.append(
                    {
                        "text": str(item["text"]),
                        "created_at": item.get("created_at")
                        if isinstance(item.get("created_at"), str)
                        else _iso(item.get("created_at")),
                    }
                )
        return out
    return []


def _iso(v: Any) -> str | None:
    if v is None:
        return None
    if isinstance(v, str):
        return v
    if hasattr(v, "isoformat"):
        return v.isoformat()
    return str(v)


def serialize_application(doc: dict[str, Any]) -> dict[str, Any]:
    st = _normalize_status(doc.get("status"))
    applied = doc.get("applied_date") or doc.get("applied_at")
    lu = doc.get("last_updated") or doc.get("updated_at")
    return {
        "id": str(doc["_id"]),
        "userId": doc["user_id"],
        "companyName": _company(doc),
        "jobTitle": _title(doc),
        "status": st,
        "jdId": _jd_id(doc),
        "coverLetterId": str(doc["cover_letter_id"]) if doc.get("cover_letter_id") else None,
        "appliedDate": _iso(applied),
        "lastUpdated": _iso(lu),
        "notes": [
            {"text": n["text"], "createdAt": n.get("created_at")}
            for n in _notes_list(doc)
        ],
        "source": doc.get("source"),
        "salaryExpectation": doc.get("salary_expectation"),
        "contactName": doc.get("contact_name"),
        "contactEmail": doc.get("contact_email"),
        "interviewDates": [_iso(x) for x in (doc.get("interview_dates") or []) if x],
        "rejectionReason": doc.get("rejection_reason"),
        "offerAmount": doc.get("offer_amount"),
        "priority": doc.get("priority") or "medium",
        "tags": list(doc.get("tags") or []),
        "matchScore": doc.get("match_score"),
        "statusHistory": list(doc.get("status_history") or []),
        "createdAt": _iso(doc.get("created_at")),
        "updatedAt": _iso(doc.get("updated_at")),
    }


def _not_deleted_filter(user_id: str) -> dict[str, Any]:
    return {"user_id": user_id, "deleted": {"$ne": True}}


def _parse_object_id(app_id: str) -> ObjectId:
    try:
        return ObjectId(app_id)
    except InvalidId as exc:
        raise ValueError("Invalid application id") from exc


class ApplicationService:
    def __init__(self, mcp: MongoMCPClient) -> None:
        self._mcp = mcp

    async def list_grouped(
        self,
        user_id: str,
        *,
        status: str | None = None,
        sort: Literal["last_updated", "created_at", "applied_date"] = "last_updated",
        limit: int = 50,
    ) -> dict[str, Any]:
        filt: dict[str, Any] = _not_deleted_filter(user_id)
        if status:
            filt["status"] = _normalize_status(status)
        sort_field = {
            "last_updated": "last_updated",
            "created_at": "created_at",
            "applied_date": "applied_date",
        }[sort]
        # Fallback sort key if missing in older docs
        docs = await self._mcp.find_many(
            "applications",
            filt,
            sort=[(sort_field, -1), ("updated_at", -1)],
            limit=limit,
        )
        grouped: dict[str, list[dict[str, Any]]] = {s: [] for s in APPLICATION_STATUSES}
        flat: list[dict[str, Any]] = []
        for raw in docs:
            d = dict(raw)
            if "_id" in d and not isinstance(d["_id"], str):
                d["_id"] = str(d["_id"])
            st = _normalize_status(d.get("status"))
            ser = serialize_application(d)
            flat.append(ser)
            if st in grouped:
                grouped[st].append(ser)
        return {"grouped": grouped, "flat": flat, "columnsOrder": APPLICATION_STATUSES}

    async def create(self, user_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        now = utcnow()
        st = _normalize_status(payload.get("status", "saved"))
        doc: dict[str, Any] = {
            "user_id": user_id,
            "company_name": payload["company_name"],
            "job_title": payload["job_title"],
            "status": st,
            "jd_id": payload.get("jd_id"),
            "cover_letter_id": payload.get("cover_letter_id"),
            "source": payload.get("source"),
            "priority": payload.get("priority") or "medium",
            "tags": list(payload.get("tags") or []),
            "match_score": payload.get("match_score"),
            "salary_expectation": payload.get("salary_expectation"),
            "contact_name": payload.get("contact_name"),
            "contact_email": payload.get("contact_email"),
            "interview_dates": [],
            "status_history": [{"status": st, "at": now}],
            "deleted": False,
            "created_at": now,
            "updated_at": now,
            "last_updated": now,
        }
        if payload.get("notes"):
            doc["notes"] = [{"text": str(payload["notes"]), "created_at": now}]
        else:
            doc["notes"] = []
        if st == "applied":
            doc["applied_date"] = now
        aid = await self._mcp.insert_one("applications", doc)
        saved = await self._mcp.find_one("applications", {"_id": aid})
        assert saved is not None
        return serialize_application(saved)

    async def update(self, user_id: str, app_id: str, payload: dict[str, Any]) -> dict[str, Any] | None:
        oid = _parse_object_id(app_id)
        existing = await self._mcp.find_one(
            "applications", {"_id": oid, "user_id": user_id, "deleted": {"$ne": True}}
        )
        if existing is None:
            return None
        now = utcnow()
        prev_status = _normalize_status(existing.get("status"))
        set_fields: dict[str, Any] = {"updated_at": now, "last_updated": now}

        if "company_name" in payload and payload["company_name"] is not None:
            set_fields["company_name"] = payload["company_name"]
        if "job_title" in payload and payload["job_title"] is not None:
            set_fields["job_title"] = payload["job_title"]
        if "source" in payload:
            set_fields["source"] = payload["source"]
        if "priority" in payload and payload["priority"] is not None:
            set_fields["priority"] = payload["priority"]
        if "tags" in payload and payload["tags"] is not None:
            set_fields["tags"] = list(payload["tags"])
        if "jd_id" in payload:
            set_fields["jd_id"] = payload["jd_id"]
        if "cover_letter_id" in payload:
            set_fields["cover_letter_id"] = payload["cover_letter_id"]
        if "salary_expectation" in payload:
            set_fields["salary_expectation"] = payload["salary_expectation"]
        if "contact_name" in payload:
            set_fields["contact_name"] = payload["contact_name"]
        if "contact_email" in payload:
            set_fields["contact_email"] = payload["contact_email"]
        if "rejection_reason" in payload:
            set_fields["rejection_reason"] = payload["rejection_reason"]
        if "offer_amount" in payload:
            set_fields["offer_amount"] = payload["offer_amount"]
        if "match_score" in payload:
            set_fields["match_score"] = payload["match_score"]
        if "interview_dates" in payload and payload["interview_dates"] is not None:
            set_fields["interview_dates"] = payload["interview_dates"]

        push_history: dict[str, Any] | None = None
        if "status" in payload and payload["status"] is not None:
            new_st = _normalize_status(str(payload["status"]))
            set_fields["status"] = new_st
            if new_st != prev_status:
                push_history = {
                    "status_history": {"status": new_st, "at": now},
                }
            if new_st == "applied" and not existing.get("applied_date") and not existing.get(
                "applied_at"
            ):
                set_fields["applied_date"] = now

        update_doc: dict[str, Any] = {"$set": set_fields}
        if push_history:
            update_doc["$push"] = push_history

        await self._mcp.update_one(
            "applications",
            {"_id": oid, "user_id": user_id},
            update_doc,
        )
        fresh = await self._mcp.find_one("applications", {"_id": oid})
        return serialize_application(fresh) if fresh else None

    async def soft_delete(self, user_id: str, app_id: str) -> bool:
        oid = _parse_object_id(app_id)
        doc = await self._mcp.find_one(
            "applications",
            {"_id": oid, "user_id": user_id, "deleted": {"$ne": True}},
        )
        if doc is None:
            return False
        await self._mcp.update_one(
            "applications",
            {"_id": oid, "user_id": user_id},
            {"$set": {"deleted": True, "updated_at": utcnow(), "last_updated": utcnow()}},
        )
        return True

    async def append_note(self, user_id: str, app_id: str, text: str) -> dict[str, Any] | None:
        oid = _parse_object_id(app_id)
        now = utcnow()
        entry = {"text": text, "created_at": now}
        existing = await self._mcp.find_one(
            "applications",
            {"_id": oid, "user_id": user_id, "deleted": {"$ne": True}},
        )
        if existing is None:
            return None
        notes_val = existing.get("notes")
        if isinstance(notes_val, str):
            base = [{"text": notes_val, "created_at": existing.get("created_at", now)}, entry]
            await self._mcp.update_one(
                "applications",
                {"_id": oid, "user_id": user_id},
                {"$set": {"notes": base, "updated_at": now, "last_updated": now}},
            )
        else:
            await self._mcp.update_one(
                "applications",
                {"_id": oid, "user_id": user_id},
                {
                    "$push": {"notes": entry},
                    "$set": {"updated_at": now, "last_updated": now},
                },
            )
        fresh = await self._mcp.find_one("applications", {"_id": oid})
        return serialize_application(fresh) if fresh else None

    async def append_interview(
        self, user_id: str, app_id: str, when: datetime
    ) -> dict[str, Any] | None:
        oid = _parse_object_id(app_id)
        now = utcnow()
        res = await self._mcp.update_one(
            "applications",
            {"_id": oid, "user_id": user_id, "deleted": {"$ne": True}},
            {
                "$push": {"interview_dates": when},
                "$set": {"updated_at": now, "last_updated": now},
            },
        )
        if res == 0:
            return None
        fresh = await self._mcp.find_one("applications", {"_id": oid})
        return serialize_application(fresh) if fresh else None

    async def get_detail(self, user_id: str, app_id: str) -> dict[str, Any] | None:
        oid = _parse_object_id(app_id)
        doc = await self._mcp.find_one(
            "applications",
            {"_id": oid, "user_id": user_id, "deleted": {"$ne": True}},
        )
        if doc is None:
            return None
        app = serialize_application(doc)
        jd = None
        cl = None
        jdid = _jd_id(doc)
        if jdid:
            try:
                jd_oid = ObjectId(jdid)
                jd = await self._mcp.find_one("job_descriptions", {"_id": jd_oid, "user_id": user_id})
            except InvalidId:
                jd = None
        clid = doc.get("cover_letter_id")
        if clid:
            try:
                cl_oid = ObjectId(str(clid))
                cl = await self._mcp.find_one("cover_letters", {"_id": cl_oid, "user_id": user_id})
            except InvalidId:
                cl = None
        return {"application": app, "jobDescription": jd, "coverLetter": cl}

    async def list_stale(
        self,
        user_id: str,
        *,
        days: int = 7,
    ) -> list[dict[str, Any]]:
        cutoff = utcnow() - timedelta(days=days)
        docs = await self._mcp.find_many(
            "applications",
            {
                "user_id": user_id,
                "deleted": {"$ne": True},
                "status": {"$in": ["applied", "phone_screen", "interview"]},
                "$or": [
                    {"last_updated": {"$lt": cutoff}},
                    {
                        "$and": [
                            {"last_updated": {"$exists": False}},
                            {"updated_at": {"$lt": cutoff}},
                        ]
                    },
                ],
            },
            sort=[("last_updated", 1), ("updated_at", 1)],
            limit=200,
        )
        out: list[dict[str, Any]] = []
        for d in docs:
            lu = d.get("last_updated") or d.get("updated_at")
            if isinstance(lu, str):
                lu_dt = datetime.fromisoformat(lu.replace("Z", "+00:00"))
            elif isinstance(lu, datetime):
                lu_dt = lu
            else:
                continue
            days_stale = max(0, int((utcnow() - lu_dt).total_seconds() // 86400))
            out.append(
                {
                    "applicationId": str(d["_id"]),
                    "companyName": _company(d),
                    "jobTitle": _title(d),
                    "status": _normalize_status(d.get("status")),
                    "daysSinceUpdate": days_stale,
                    "suggestedAction": "follow up",
                }
            )
        return out


def is_valid_status(status: str) -> bool:
    return _normalize_status(status) in APPLICATION_STATUSES
