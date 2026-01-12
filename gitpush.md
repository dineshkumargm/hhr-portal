🔁 CORRECT DAILY FLOW (NO ERRORS)

Every time you start working:

1️⃣ Switch to your branch
git checkout sanjay-ui-fixes

2️⃣ Sync with latest production code

(assuming default branch is master)

git fetch origin
git merge origin/master


⚠️ This step is non-negotiable.
It keeps your branch aligned with the live site.

3️⃣ Make your new changes

Code → test → verify locally.

4️⃣ Commit cleanly
git add .
git commit -m "Add validation to employee form"

5️⃣ Push to the SAME branch
git push origin sanjay-ui-fixes

6️⃣ Create / Update Pull Request

Same PR can stay open

OR create a new PR (cleaner)

Dinesh merges → Vercel deploys → site updates 🚀