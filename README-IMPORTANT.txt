SCLVN MODERATION V9
=====================

FILES TO REPLACE
----------------
js/pages/Submit.js
js/pages/Admin.js
js/content.js
js/firebase-init.js
css/main.css

NEW OPTIONAL BACKEND FILE
-------------------------
worker/raw-footage-worker.js

WHAT IS INCLUDED
----------------
1. Submit Record:
   - Type of Record: Completion / Verification
   - Searchable custom Level selector
   - "Completion" renamed to "Percentage"
   - Video Link marked optional
   - Raw Footage file picker
   - Verification asks for Level ID + Level name
   - Duplicate victor check before Completion submission

2. Admin moderation:
   - Admin cannot Approve/Reject their own submission in the UI
   - Confirmation modal before Approve/Reject
   - Pending / History tabs
   - Reviewer name, email, UID and reviewed time saved
   - Reject reason saved
   - Verification submissions get an Add Level panel
   - Add Level fields:
       FPS
       Method: Alternate / Alt-Jitter / Jitter / Button Mashing / Rake / Lip Spam / Custom
       Handcam: Recommended / Necessary
       Device: All / Uncapped / K55 / K70 / Logitech G512 / CPS Cap
       Uploader
       Creators
       Percent to qualify
       List position
   - CPS Cap generates:
       All, devices with a [number]cps cap or higher.

3. Duplicate score protection:
   - Submit blocks a player that is already verifier or 100% victor
   - Approval checks again against CURRENT Firestore data
   - Existing lower progress by the same player is REPLACED when a higher progress is approved
   - content.js defensively counts only the best record per player per level
     and ignores duplicate completion records belonging to the verifier

RAW FOOTAGE IMPORTANT
---------------------
The file picker is already in Submit.js.

If no Raw Footage file is selected, submissions still work.
This is intentional so the site is not broken while the upload backend is being configured.

If a Raw Footage file IS selected, Submit.js requires a backend URL.

After deploying worker/raw-footage-worker.js, define:

    window.SCLVN_RAW_UPLOAD_ENDPOINT =
        "https://YOUR-WORKER.workers.dev/upload-session";

The Worker creates a Google Drive resumable-upload session.
The large video then uploads directly from the member's browser to Google Drive.

DO NOT put Google OAuth secrets in Submit.js, index.html, GitHub, or any client-side file.

CLOUDFLARE WORKER SETTINGS
--------------------------
Configure these as Worker secrets/variables:

GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REFRESH_TOKEN
FIREBASE_WEB_API_KEY
DRIVE_FOLDER_ID
ALLOWED_ORIGINS

DRIVE_FOLDER_ID:
1IY0r3Cak5WApJA2v4aoFeHx10VgS-FjPb1mmQ5l5XLsWqtopm6IyPXZh40TObiMJch7T1rtd

ALLOWED_ORIGINS is comma-separated, for example:
https://your-domain.example,https://your-workers-domain.workers.dev

The Google OAuth refresh token must belong to an account that can upload
to the target Drive folder.

FIRESTORE RULES
---------------
DO NOT publish the previously generated strict rules yet.

The current SCLVN login flow looks up /users by username BEFORE Firebase
authentication. Strict private /users rules would break username login.

This V9 package enforces "another admin must review" in the application code.
For a tamper-proof Firestore rule, first obtain the CURRENT Rules from the
Firebase project so they can be upgraded without breaking Login.

TEST CHECKLIST
--------------
1. Login as normal member.
2. Submit Completion without Raw Footage -> should create pending submission.
3. Try a level where the same player is already 100% -> should be blocked.
4. Submit Verification with a new Level ID.
5. Login as admin A and submit something.
6. Admin A opens Review -> own submission buttons must be disabled.
7. Admin B reviews it -> confirmation modal must appear.
8. Approve Completion -> record is added/replaced correctly.
9. Approve Verification -> level document is created and inserted into meta/list.
10. Check History -> reviewer and review time should appear.
