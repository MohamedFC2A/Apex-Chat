# Firestore Index Configuration

## Required Composite Index

To enable cloud chat synchronization, you must create a composite index in Firebase Console.

### Index Details

**Collection Group**: `chats`  
**Query Scope**: Collection Group (to work across all user subcollections)

**Fields to Index:**
1. `isDeleted` - Ascending
2. `updatedAt` - Descending

### Quick Setup

#### Option 1: Firebase Console (Recommended)

1. Go to: https://console.firebase.google.com/project/gen-lang-client-0258578294/firestore/indexes
2. Click **"Create Index"**
3. Configure:
   - **Collection ID**: `chats`
   - **Query Scope**: `Collection Group`
   - **Fields**:
     - Field: `isDeleted`, Order: `Ascending`
     - Field: `updatedAt`, Order: `Descending`
4. Click **"Create Index"**
5. Wait 2-5 minutes for the index to build

#### Option 2: CLI (Faster for Developers)

```bash
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Login to Firebase
firebase login

# Deploy the index configuration
firebase deploy --only firestore:indexes
```

The index configuration is defined in `firestore.indexes.json`:

```json
{
  "indexes": [
    {
      "collectionGroup": "chats",
      "queryScope": "COLLECTION_GROUP",
      "fields": [
        {
          "fieldPath": "isDeleted",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "updatedAt",
          "order": "DESCENDING"
        }
      ]
    }
  ]
}
```

### Why This Index is Needed

The app uses this query to fetch user chats:

```typescript
query(
  collection(db, "users", userId, "chats"),
  where("isDeleted", "==", false),
  orderBy("updatedAt", "desc"),
  limit(100)
)
```

Firestore requires a composite index when:
- Using `where()` with `orderBy()` on different fields
- Querying across subcollections (collection group queries)

### Error Handling

The app gracefully handles index-building scenarios:

**During Index Building:**
- 🔧 **UI Message**: "System Optimizing... This may take a few minutes."
- **Behavior**: Falls back to localStorage, no data loss
- **Console**: Provides direct link to Firebase console

**Permission Denied:**
- 🔒 **UI Message**: "Login Refresh Needed. Please sign out and sign back in."
- **Behavior**: Local-only mode until login refresh
- **Action Button**: Quick sign-out in Settings

**Offline Mode:**
- 📡 **UI Message**: "Offline Mode - Changes saved locally"
- **Behavior**: Full offline support with auto-sync on reconnection

### Firestore Security Rules

Ensure your security rules allow reading from the chats subcollection:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User data rules
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // Chats subcollection
      match /chats/{chatId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
    
    // Vouchers (admin-managed, read-only for users)
    match /vouchers/{voucherId} {
      allow read: if request.auth != null;
      allow write: if false; // Admin only via Firebase Admin SDK
    }
  }
}
```

### Verification

After creating the index, verify it works:

1. Open the app and sign in
2. Check Settings > Cloud Sync panel
3. Status should show: 🟢 **Connected** - "Syncing to Firestore"
4. Create a new chat
5. Sign out and sign in on another device/browser
6. Chat should appear automatically

### Troubleshooting

**Index Still Building After 10 Minutes:**
- Check Firebase Console for index status
- Ensure you selected "Collection Group" scope
- Verify field names match exactly: `isDeleted`, `updatedAt`

**Still Getting Permission Denied:**
- Deploy updated security rules: `firebase deploy --only firestore:rules`
- Check Firebase Console > Firestore > Rules tab
- Ensure user is authenticated (`request.auth != null`)

**Chats Not Syncing:**
- Check browser console for detailed error messages
- Verify internet connection (Settings shows offline status)
- Force sync via Settings > Cloud Sync > "Force Sync" button

### Index Status Check

You can check index build status at:
https://console.firebase.google.com/project/gen-lang-client-0258578294/firestore/indexes

**Index States:**
- 🟢 **Enabled**: Ready to use
- 🟡 **Building**: In progress (2-10 minutes)
- 🔴 **Error**: Check configuration and retry

### Performance Impact

**With Index:**
- Query time: < 100ms
- Supports 100+ chats per user
- Real-time updates via `onSnapshot()`

**Without Index:**
- Query fails with `failed-precondition` error
- App falls back to localStorage
- No cross-device sync
