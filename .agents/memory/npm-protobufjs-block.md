---
name: npm firewall blocks protobufjs entirely
description: Replit's package firewall blocks all versions of protobufjs (Critical CVE), not just a specific one — pinning via overrides does not help.
---

When `npm install` fails with `403 Blocked by Security Policy` on `protobufjs`, this is a blanket block on the package (any version), not a single-version CVE. Adding an `overrides` entry to pin a different protobufjs version still gets blocked.

**Why:** Observed the firewall reject both the default resolved version (7.5.4) and a manually pinned older version (7.2.6) with the same "Critical CVE" message.

**How to apply:** Trace which top-level dependency pulls in protobufjs (commonly via `@grpc/grpc-js` / `@grpc/proto-loader`, e.g. through `firebase`'s `@firebase/firestore`) and remove/replace that dependency instead of trying to override the protobufjs version. If the flagged code path is actually unused (e.g. dead import), just delete it.
