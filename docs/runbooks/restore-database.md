# Runbook: back up and restore the database

- **Applies to:** [ADR-005](../adr/005-hosting-and-environments.md). There's one section per phase. **Check which phase you're in first.**
- **Related:**
  - [deploy and rollback](deploy-and-rollback.md): a code rollback is not a restore
  - [design note §9](../design/observability.md)

> **Secrets:** the commands below prompt for passwords (`-p` with no value). Never put a password on a command line, in a file in the repo, or in a chat.

## 0. Which tool for which problem?

| Problem | Restore? | Do this instead or first |
|---|---|---|
| Bad code shipped | **No** | Roll back the code ([deploy and rollback §4](deploy-and-rollback.md)). The schema is expand/contract-safe. |
| A migration failed halfway | Usually not | [deploy and rollback §6](deploy-and-rollback.md): inspect, then fix forward |
| Data was deleted or corrupted (a bug, a bad script, a person) | **Yes** | This runbook |
| The database service itself is lost | **Yes** | This runbook (Phase 0: a logical backup is the only path) |

**Two numbers to know before you need them:**
- **RPO (recovery point objective):** how much data you can afford to lose, i.e. how old your newest restorable copy is.
- **RTO (recovery time objective):** how long getting back takes.

| Phase | RPO | RTO |
|---|---|---|
| Phase 0 | the age of your last manual dump | about 30 min |
| Phase 1 | minutes (PITR) | about 30–60 min |

## 1. What is actually backed up (verified 2026-10-04)

| | Phase 0: Aiven free MySQL | Phase 1: Cloud SQL for MySQL 8.4 |
|---|---|---|
| **Provider backups** | "Single backup only for disaster recovery". **No PITR, no forking.** Aiven restores by forking, so **we cannot restore it ourselves.** It protects against Aiven losing the node, not against our mistakes. ([Aiven plans](https://aiven.io/pricing/mysql)) | Automated daily backups plus binary logs: **PITR** over the retention window (Enterprise edition: 1–7 days) ([Cloud SQL](https://docs.cloud.google.com/sql/docs/mysql/backup-recovery/configure-pitr)) |
| **Our backups** | **Manual logical dumps (§2).** Take one before every risky migration, and keep the latest few. | Optional logical dumps for long-term or off-provider copies |
| **Matches ADR-005?** | ADR-005 said "limited backups". It has been corrected to say they're not restorable by us. | The plan as written |

**Phase 0 is acceptable only because no real user data exists.** The first real user's data is the trigger for Phase 1 (ADR-005).

## 2. Phase 0: take a logical backup

**When:**
- before any migration that alters or drops anything
- before the move to Cloud SQL
- whenever you'd be upset to lose what's there

**You need:**
- Docker
- the environment's `ca.pem` (Aiven console → service → CA certificate)
- the host and port
- the `avnadmin` password (from the Aiven console)

```sh
mkdir -p ~/cdo-backups && cd ~/cdo-backups      # outside the repo, always
cp /path/to/ca.pem .
STAMP="$(date -u +%Y%m%dT%H%MZ)"
docker run --rm -it -v "$PWD:/work" mysql:8.4 \
  mysqldump --host <host> --port <port> --user avnadmin -p \
    --ssl-mode=VERIFY_CA --ssl-ca=/work/ca.pem \
    --single-transaction --set-gtid-purged=OFF --no-tablespaces \
    --result-file="/work/creator_deal_os-<env>-${STAMP}.sql" \
    creator_deal_os
```

- `--single-transaction` gives a consistent snapshot without locking tables (InnoDB).
- `--set-gtid-purged=OFF` lets the dump restore into a different server.
- `--no-tablespaces` avoids needing the `PROCESS` privilege.

**Encrypt it, then delete the plain file.** It contains everything in the database.

```sh
openssl enc -aes-256-cbc -pbkdf2 -salt \
  -in "creator_deal_os-<env>-${STAMP}.sql" -out "creator_deal_os-<env>-${STAMP}.sql.enc"   # prompts for a passphrase
rm -P "creator_deal_os-<env>-${STAMP}.sql" 2>/dev/null || rm "creator_deal_os-<env>-${STAMP}.sql"
```

- **The passphrase:** keep it in your password manager.
- **Where to keep the encrypted file:** somewhere you'd still have it if this laptop died (an encrypted cloud drive). **Never in the repo**, and never in GitHub artifacts.
- **How many to keep:** the last 3. Delete older ones; old personal data is a liability.

## 3. Phase 0: restore

**Rule:** restore **next to** the current data, never over it. Keep the damaged copy until you know you don't need it, for forensics.

1. **Decrypt:**
   ```sh
   openssl enc -d -aes-256-cbc -pbkdf2 -in <file>.sql.enc -out restore.sql
   ```
2. **Create a fresh database** on the same service (as `avnadmin`):
   ```sql
   CREATE DATABASE creator_deal_os_restore CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
   ```
   If the service itself is gone, create a new free Aiven MySQL service first. Then follow the user setup from [deploy and rollback §1.4](deploy-and-rollback.md), using the new host.
3. **Load the dump:**
   ```sh
   docker run --rm -it -v "$PWD:/work" mysql:8.4 \
     mysql --host <host> --port <port> --user avnadmin -p \
       --ssl-mode=VERIFY_CA --ssl-ca=/work/ca.pem \
       creator_deal_os_restore -e "source /work/restore.sql"
   ```
4. **Verify before switching** (§5).
5. **Switch the app to the restored database:**
   ```sql
   GRANT ALL PRIVILEGES ON creator_deal_os_restore.* TO 'cdo_migrator'@'%';
   GRANT SELECT, INSERT, UPDATE, DELETE ON creator_deal_os_restore.* TO 'cdo_app'@'%';
   ```
   1. Point both secrets at the new database name:
      ```sh
      PROJECT_ID=<project> infra/gcp/set-secret.sh api-database-url      # …/creator_deal_os_restore
      PROJECT_ID=<project> infra/gcp/set-secret.sh migrate-database-url
      ```
   2. Run **Deploy** (Actions → *Run workflow*) so new revisions read the new secret versions.
   3. Check that the smoke test passes.
6. **Clean up later, not now:**
   - Keep the old database for 7 days.
   - Then drop it by hand, as `avnadmin` (`DROP DATABASE creator_deal_os;`), and note it in the incident log.
   - Delete `restore.sql` (`rm -P`).
   - Disable the old secret versions.

The database name is part of the URL secret, so a different name needs no code change.

## 4. Phase 1: restore Cloud SQL to a point in time

**PITR never overwrites the source instance.** It clones a new instance as of a timestamp.

```sh
# The moment just BEFORE the damage, in UTC (find it in the logs: requestId, migrate job time, Sentry).
gcloud sql instances clone <instance> <instance>-restore-$(date -u +%Y%m%d%H%M) \
  --point-in-time "2026-10-04T14:02:00Z" --project <project>

# Or from a daily backup:
gcloud sql backups list --instance <instance> --project <project>
gcloud sql backups restore <backup-id> --restore-instance <new-instance> --project <project>
```

Then:
1. Verify (§5).
2. Point the database secrets at the new instance.
3. Redeploy.
4. Keep the old instance for 7 days, then delete it.

The Phase 1 ADR will fill in the connection details (private IP or connector).

## 5. Verify a restored database

**Run against the restored copy, as `avnadmin`:**
```sql
-- The schema is at the expected migration (compare with the source, or with the release you expect):
SELECT id, hash, created_at FROM __drizzle_migrations ORDER BY created_at DESC LIMIT 3;

-- The tables exist, with plausible sizes (table_rows is an estimate for InnoDB):
SELECT table_name, table_rows FROM information_schema.tables
WHERE table_schema = 'creator_deal_os_restore' ORDER BY table_name;

-- Exact counts for the tables that matter (add the real ones as they arrive in M2–M4):
-- SELECT COUNT(*) FROM workspaces;  SELECT COUNT(*) FROM deals;  SELECT MAX(updated_at) FROM deals;
```

**Then the app's own check:** after the switch, the deploy's smoke test must pass. `/health/ready` is `ready`, and the page renders.

## 6. Restore drill

The roadmap's M5 exit requires one drill to have passed; repeat it quarterly afterwards. Run it in **staging**, or in production into a throwaway database. Never copy production data out of production.

1. Write some recognisable test data in staging.
2. Take a backup (§2), then delete the test data.
3. Restore into `creator_deal_os_restore` (§3, steps 1–4), and verify (§5) that the data is back.
4. Drop the throwaway database.
5. **Record it** in `docs/runbooks/restore-drills.md`. Create that file at the first drill, with the date, the phase, the backup's age (RPO), the time from start to verified (RTO), problems, and runbook fixes.

**A backup you've never restored is a hope, not a backup.**
