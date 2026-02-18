# Contact Messages API

This module allows users to submit contact messages via a public endpoint and lets admins manage submitted messages.

## Table of Contents
- [Public Endpoints](#public-endpoints)
  - [Submit Contact Message](#submit-contact-message)
- [Admin Endpoints](#admin-endpoints)
  - [List Contact Messages](#list-contact-messages)
  - [Update Contact Message](#update-contact-message)
  - [Delete Contact Message](#delete-contact-message)

---

## Public Endpoints

### Submit Contact Message
- Method: `POST`
- Path: `/contact-messages`
- Auth: Not required
- Body:
  ```json
  {
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "message_text": "I would like to know more about your services."
  }
  ```
- Response `201`:
  ```json
  {
    "id": "uuid",
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "message_text": "I would like to know more about your services.",
    "status": "new",
    "admin_notes": null,
    "created_at": "2025-01-01T12:00:00.000Z",
    "updated_at": "2025-01-01T12:00:00.000Z"
  }
  ```

Curl example:
```bash
curl -X POST https://<api-base>/contact-messages \
  -H "Content-Type: application/json" \
  -d '{
    "first_name":"John",
    "last_name":"Doe",
    "email":"john@example.com",
    "message_text":"I would like to know more about your services."
  }'
```

---

## Admin Endpoints
All admin endpoints require JWT authentication and the `admin` role.

### List Contact Messages
- Method: `GET`
- Path: `/admin/contact-messages`
- Auth: `Bearer <token>` (Admin)
- Query params:
  - `page` (number, optional, default `1`)
  - `limit` (number, optional, default `20`, max `100`)
  - `status` (optional: `new|read|archived|replied`)
  - `search` (optional: matches first_name, last_name, or email)
- Response `200`:
  ```json
  {
    "items": [
      {
        "id": "uuid",
        "first_name": "John",
        "last_name": "Doe",
        "email": "john@example.com",
        "message_text": "I would like to know more...",
        "status": "new",
        "admin_notes": null,
        "created_at": "2025-01-01T12:00:00.000Z",
        "updated_at": "2025-01-01T12:00:00.000Z"
      }
    ],
    "total": 1
  }
  ```

Curl example:
```bash
curl -X GET 'https://<api-base>/admin/contact-messages?status=new&search=john' \
  -H "Authorization: Bearer <ADMIN_JWT>"
```

### Update Contact Message
- Method: `PUT`
- Path: `/admin/contact-messages/:id`
- Auth: `Bearer <token>` (Admin)
- Body (any of):
  ```json
  {
    "status": "read",
    "admin_notes": "Followed up via email."
  }
  ```
- Response `200`: Updated message object

Curl example:
```bash
curl -X PUT https://<api-base>/admin/contact-messages/<id> \
  -H "Authorization: Bearer <ADMIN_JWT>" \
  -H "Content-Type: application/json" \
  -d '{"status":"read","admin_notes":"Followed up via email."}'
```

### Delete Contact Message
- Method: `DELETE`
- Path: `/admin/contact-messages/:id`
- Auth: `Bearer <token>` (Admin)
- Response `200`:
  ```json
  { "id": "uuid" }
  ```

Curl example:
```bash
curl -X DELETE https://<api-base>/admin/contact-messages/<id> \
  -H "Authorization: Bearer <ADMIN_JWT>"
```

---

## Validation
- `email` must be a valid email address.
- `first_name`, `last_name`, and `message_text` are required.
- Admin `status` must be one of: `new`, `read`, `archived`, `replied`.

## Notes
- New messages default to `status = "new"`.
- Timestamps are in ISO 8601 with timezone.


