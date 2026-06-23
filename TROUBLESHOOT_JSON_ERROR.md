# 🚨 TROUBLESHOOTING: "Unexpected token <" JSON Error

## ❌ The Error

```
SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
```

## 🔍 What This Means

Something is trying to parse **HTML** as **JSON**. This happens when:
1. Frontend calls an API endpoint that doesn't exist
2. Server returns `index.html` (the 404/fallback page)
3. Code tries to `JSON.parse()` the HTML → **CRASH**

---

## ✅ CONFIRMED: No API Calls Exist

We've verified:
- ✅ **ZERO** `fetch()` calls to `/api/*` in the codebase
- ✅ **ZERO** `axios` calls anywhere
- ✅ **ZERO** references to `/voucher/redeem`
- ✅ Server endpoint properly deprecated (returns 410 Gone)
- ✅ All voucher logic uses Firestore SDK directly

**Conclusion:** The error is coming from **cached browser code**, not the current codebase.

---

## 🛠️ SOLUTION: Hard Refresh & Cache Clear

### **Option 1: Force Browser Refresh (Recommended)**

#### **Windows:**
1. Open the app in your browser
2. Press **`Ctrl + Shift + Delete`**
3. Select:
   - ✅ Cached images and files
   - ✅ Cookies and site data
   - ⏱️ Time range: "All time"
4. Click **"Clear data"**
5. Press **`Ctrl + Shift + R`** (hard reload)

#### **Mac:**
1. Open the app
2. Press **`Cmd + Shift + Delete`**
3. Clear cache
4. Press **`Cmd + Shift + R`**

---

### **Option 2: DevTools Cache Disable**

1. Open DevTools (`F12`)
2. Go to **Network** tab
3. Check ✅ **"Disable cache"**
4. Keep DevTools open
5. Refresh page (`Ctrl + R`)

---

### **Option 3: Incognito/Private Mode**

1. Open a **new incognito window** (`Ctrl + Shift + N`)
2. Navigate to `http://localhost:5000`
3. Test voucher redemption
4. If it works → cache was the issue

---

### **Option 4: Nuclear Option (Clear Everything)**

```bash
# Stop the dev server (Ctrl + C)

# Clear all build artifacts
rm -rf dist/
rm -rf node_modules/.vite/
rm -rf client/node_modules/.cache/

# Rebuild
npm run dev
```

Then in browser:
- Clear all site data (F12 → Application → Clear storage)
- Hard reload (`Ctrl + Shift + R`)

---

## 🧪 Test Voucher Redemption

After clearing cache, test with a seed voucher:

### **Step 1: Create Test Voucher in Firestore**

Go to: https://console.firebase.google.com/project/gen-lang-client-0258578294/firestore

1. Navigate to `vouchers` collection
2. Click **"Add document"**
3. Use auto-generated ID
4. Add fields:
   ```
   code: "TEST123"
   amount: 50
   maxUses: 2
   usedBy: []
   status: "active"
   description: "Test Voucher"
   createdAt: "2025-12-12T22:00:00.000Z"
   ```

### **Step 2: Test Redemption**

1. Open app → Settings → Wallet
2. Enter code: `TEST123`
3. Click **"Redeem"**

**Expected Success:**
```json
{
  "success": true,
  "message": "Voucher redeemed! $50 added. (1 uses remaining)",
  "amount": 50,
  "remainingUses": 1
}
```

**Expected Failures (these are GOOD - means validation works):**

```json
// Invalid code
{
  "success": false,
  "message": "Invalid voucher code. Please check and try again."
}

// Already redeemed by same user
{
  "success": false,
  "message": "You have already redeemed this voucher."
}

// Exhausted voucher
{
  "success": false,
  "message": "This voucher has reached its maximum usage limit."
}
```

---

## 🔎 Debug: Check Network Tab

If error persists after cache clear:

1. Open DevTools (`F12`)
2. Go to **Network** tab
3. Click **"Redeem"** button
4. Look for requests to `/api/*`

**What you should see:**
- ✅ **NO** requests to `/api/voucher/redeem`
- ✅ Only requests to `firestore.googleapis.com`

**What's BAD (if you see this):**
- ❌ Request to `/api/voucher/redeem`
- ❌ Response: `Status 404` or `410`
- ❌ Response body: HTML (`<!DOCTYPE html>`)

If you see the bad pattern → the browser is running **old cached JavaScript**.

---

## 📝 Check Console for Exact Error

Open Console tab and look for:

```
Error: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
    at JSON.parse (<anonymous>)
    at redeemVoucher (subscription-store.ts:XX)
```

**The line number** will tell us exactly where the error is.

**Share with developer:**
- Line number
- Full stack trace
- Which file (`subscription-store.ts`, `wallet-store.ts`, etc.)

---

## 🚀 If Error Persists After Cache Clear

### **Check 1: Verify Firestore Rules**

```bash
firebase deploy --only firestore:rules
```

Expected output:
```
✓ firestore: released rules firestore.rules to cloud.firestore
```

### **Check 2: Verify User is Authenticated**

Open Console and run:
```javascript
import { auth } from './firebase';
console.log("User:", auth.currentUser);
```

Expected:
```javascript
User: {
  uid: "abc123...",
  email: "user@example.com",
  ...
}
```

If `null` → user is not logged in (Firestore will reject queries).

### **Check 3: Test Direct Firestore Query**

Open Console and run:
```javascript
import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';

const snapshot = await getDocs(collection(db, 'vouchers'));
console.log("Vouchers:", snapshot.docs.map(d => d.data()));
```

Expected:
```javascript
Vouchers: [
  { code: "TEST123", amount: 50, status: "active", ... }
]
```

If error → Firestore rules issue or connection problem.

---

## 🎯 Root Cause Analysis

| Symptom | Cause | Fix |
|---------|-------|-----|
| "Unexpected token <" | Cached old JS calling `/api/voucher/redeem` | Clear cache + hard reload |
| "Permission denied" | Firestore rules not deployed | `firebase deploy --only firestore:rules` |
| "Invalid voucher code" (always) | No vouchers in Firestore | Seed vouchers in Firebase Console |
| Network request to `/api/*` | Browser cache serving old bundle | Disable cache in DevTools |

---

## ✅ Verification Checklist

After fixes, confirm:

- [ ] No requests to `/api/voucher/*` in Network tab
- [ ] Only Firestore requests to `firestore.googleapis.com`
- [ ] Voucher redemption returns success JSON
- [ ] Balance updates immediately in UI
- [ ] Transaction appears in history
- [ ] Multi-use vouchers track `usedBy` array correctly
- [ ] Status changes from "active" → "exhausted" when limit reached

---

## 📞 Still Broken?

If you've tried everything and it still fails, provide:

1. **Full error message** from Console (with stack trace)
2. **Screenshot** of Network tab during redemption
3. **Screenshot** of Firestore vouchers collection
4. **Browser + version** (Chrome 120, Firefox 121, etc.)
5. **Operating system** (Windows 11, macOS 14, etc.)

---

**Last Updated:** December 12, 2025  
**Status:** All API calls removed, Firestore-only architecture confirmed  
**Next Step:** Clear browser cache and test
