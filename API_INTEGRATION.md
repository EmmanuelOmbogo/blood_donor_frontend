# DamuLink frontend and API contract

The React client uses live API responses only. It does not seed, generate, or
fall back to sample donors, requests, dashboard totals, or drive records.

## Run the frontend

1. Install Node.js 20 or newer.
2. Copy `.env.example` to `.env` and set `VITE_API_BASE_URL` to the Django API
   base URL (the default is `http://localhost:8000/api`).
3. Run `npm install`, then `npm run dev`.

The API must allow the frontend origin through CORS. Authentication uses a
Bearer access token held in browser local storage. Use HTTPS outside local
development. The API should issue short-lived tokens and enforce permissions
on every endpoint; client-side role checks only control the interface.

## Local demo sign-in

When running Vite in development with no API server reachable, the sign-in
screen offers three local demo accounts (admin, hospital staff, and drive
staff). Select **Use** beside an account to fill its credentials. Demo sign-in
is disabled in production builds. If the API is reachable, API authentication
takes precedence; invalid API credentials do not fall back to demo accounts.
Demo accounts only open the interface: donor, request, report, and drive data
still require an API, and no SMS is sent. Do not use demo credentials as real
production accounts.

Set `VITE_ENABLE_DEMO_AUTH=false` in a development `.env` to disable local demo
sign-in. The example environment enables it for local development.

## Response conventions

- JSON requests and responses; dates are ISO 8601 strings.
- List endpoints return `{ "results": [], "count": 0, "next": null, "previous": null }`.
- Errors return `{ "message": "Readable explanation", "fieldErrors": { "field": "Reason" } }`.
- Blood groups are `A+`, `A-`, `B+`, `B-`, `AB+`, `AB-`, `O+`, and `O-`.
- User roles are `admin`, `hospital_staff`, and `drive_staff`.

## Endpoints used by the frontend

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/auth/login` | Body `{ email, password }`; returns `{ access, user }`. |
| GET | `/auth/me` | Returns the current `User`. |
| GET | `/dashboard/summary` | Live dashboard metrics and recent requests. |
| GET | `/donors?search=&bloodGroup=&area=&page=` | Search and filter registered donors. |
| POST | `/donors` | Register a donor after clear screening and recorded SMS consent. |
| GET | `/requests?search=&status=&page=` | List requests and matched donor/SMS states. |
| POST | `/requests` | Create request and calculate eligible compatible matches; do not send SMS yet. |
| POST | `/requests/{id}/alerts` | Dispatch SMS alerts to the saved matched donors. |
| PATCH | `/requests/{id}/status` | Body `{ status }`; update request lifecycle. |
| GET | `/drives?search=&status=&page=` | List donation drives. |
| GET | `/reports/summary?from=&to=` | Return summary metrics for a date range. |

## SMS request workflow

1. `POST /requests` validates the hospital request and creates a durable
   request record. The backend computes matches using blood-group
   compatibility, eligibility, location, consent, and opt-out status. It
   returns the new request with its `matchedDonors` list and no messages sent.
2. The staff member reviews the match list and chooses **Send SMS alerts**.
   `POST /requests/{id}/alerts` queues a message for each eligible, opted-in
   match. The browser never calls the SMS provider directly and never receives
   a full donor phone number in the match list.
3. The response refreshes SMS delivery state and donor replies. The SMS
   provider callback should update the saved donor response and message
   delivery status; the frontend reads those states on subsequent API fetches.
4. Process `YES`, `NO`, and `STOP` replies case-insensitively. `STOP` must
   immediately set the donor's opt-out state and prevent future alerts.
   Deduplicate provider callbacks and alert-dispatch retries so retries cannot
   send duplicate messages. Record dispatch, delivery, reply, and status
   changes in the audit trail.

The frontend keeps a request from being marked fulfilled until its matched
donors have been alerted. Enforce the same rule in the API so a direct status
update cannot bypass SMS dispatch.

The proposal names Africa's Talking as the planned SMS provider. Keep provider
credentials and sending logic in Django; the frontend depends only on the
request alert endpoint above.

## Core response shapes

`User`:

```json
{
  "id": "user-id",
  "name": "Staff member",
  "email": "staff@example.org",
  "role": "hospital_staff",
  "organization": "Facility name"
}
```

`DashboardSummary`:

```json
{
  "registeredDonors": 0,
  "eligibleDonors": 0,
  "activeRequests": 0,
  "livesSupported": 0,
  "donorsByBloodGroup": {},
  "recentRequests": []
}
```

`Donor` includes `id`, `fullName`, `phoneNumber`, `nationalId`, `location`,
`bloodGroup`, `lastDonationDate`, `eligible`, `consentToSms`, `optedOut`,
`screeningStatus` (`clear` only), and `createdAt`. Enforce screening and
eligibility rules on the server. Restrict personally identifying fields by
role and keep an audit record for donor record access and changes.

`BloodRequest` includes `id`, `reference`, `hospitalName`, `contactName`,
`contactPhone`, `bloodGroup`, `unitsNeeded`, `unitsFulfilled`, `area`,
`urgency` (`routine`, `urgent`, `critical`), `neededBy`, `notes`, `status`,
`matchedDonors`, `smsDispatchedAt`, and `createdAt`.

Each `matchedDonors` entry includes `donorId`, `fullName`, `phoneNumberMasked`,
`location`, `bloodGroup`, `response` (`pending`, `yes`, `no`, `opted_out`,
`failed`), `smsStatus` (`queued`, `sent`, `delivered`, `failed`, `not_sent`),
and `respondedAt`.

`DonationDrive` includes `id`, `name`, `venue`, `area`, `startsAt`, `endsAt`,
`status` (`scheduled`, `active`, `completed`, `cancelled`), and
`registeredDonors`.
