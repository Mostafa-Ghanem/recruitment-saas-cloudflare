// Run: node tools/recruitment-db-smoke.mjs
// Dependency-free smoke test: exercises the committed SQLite/D1 migration.
import { strict as assert } from 'node:assert'
import { DatabaseSync } from 'node:sqlite'
// oxlint-disable-next-line effect/noNodeBuiltinImport -- Node-only migration CLI requires direct filesystem reads
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const migration = fileURLToPath(
  new URL(
    '../packages/db/migrations/20261102173000_recruitment_mvp/migration.sql',
    import.meta.url
  )
)
const db = new DatabaseSync(':memory:')
db.exec('PRAGMA foreign_keys=ON')
db.exec(`CREATE TABLE workspaces (id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE,
  suspensionStatus TEXT NOT NULL DEFAULT 'active')`)
db.prepare('INSERT INTO workspaces(id,slug) VALUES (?,?)').run(
  'workspace-a',
  'workspace-a'
)
db.prepare('INSERT INTO workspaces(id,slug) VALUES (?,?)').run(
  'workspace-b',
  'workspace-b'
)
db.exec(readFileSync(migration, 'utf8'))
const integrityMigration = fileURLToPath(
  new URL(
    '../packages/db/migrations/20261102202000_recruitment_application_uniqueness/migration.sql',
    import.meta.url
  )
)
db.exec(readFileSync(integrityMigration, 'utf8'))
const publicIntakeMigration = fileURLToPath(
  new URL(
    '../packages/db/migrations/20261102213000_recruitment_public_intake/migration.sql',
    import.meta.url
  )
)
db.exec(readFileSync(publicIntakeMigration, 'utf8'))

function addJob(id, workspaceId, status = 'draft') {
  db.prepare(`INSERT INTO recruitment_jobs
    (id,workspace_id,title,status,created_at,updated_at)
    VALUES (?,?,?,?,?,?)`).run(id, workspaceId, id, status, 'now', 'now')
}
function addCandidate(id, workspaceId) {
  db.prepare(`INSERT INTO recruitment_candidates
    (id,workspace_id,full_name,created_at) VALUES (?,?,?,?)`).run(
    id,
    workspaceId,
    'Candidate',
    'now'
  )
}
function addApplication(id, workspaceId, jobId, candidateId) {
  db.prepare(`INSERT INTO recruitment_applications
    (id,workspace_id,job_id,candidate_id,created_at,updated_at)
    VALUES (?,?,?,?,?,?)`).run(id, workspaceId, jobId, candidateId, 'now', 'now')
}

addJob('a-draft', 'workspace-a')
addJob('a-live', 'workspace-a', 'published')
addJob('b-live', 'workspace-b', 'published')
addCandidate('a-candidate', 'workspace-a')
addCandidate('b-candidate', 'workspace-b')

assert.throws(
  () => addApplication('cross-candidate', 'workspace-a', 'a-live', 'b-candidate'),
  /FOREIGN KEY/
)
assert.throws(
  () => addApplication('cross-job', 'workspace-a', 'b-live', 'a-candidate'),
  /FOREIGN KEY/
)
addApplication('valid', 'workspace-a', 'a-live', 'a-candidate')
assert.throws(
  () => addApplication('duplicate', 'workspace-a', 'a-live', 'a-candidate'),
  /UNIQUE/
)
assert.equal(
  db
    .prepare('SELECT COUNT(*) as n FROM recruitment_applications WHERE workspace_id=?')
    .get('workspace-a').n,
  1
)
assert.equal(
  db
    .prepare('SELECT COUNT(*) as n FROM recruitment_applications WHERE workspace_id=?')
    .get('workspace-b').n,
  0
)
assert.equal(
  db
    .prepare(`SELECT COUNT(*) as n FROM recruitment_jobs
  WHERE workspace_id=? AND status='published'`)
    .get('workspace-a').n,
  1
)
assert.equal(
  db
    .prepare(`SELECT COUNT(*) as n FROM recruitment_jobs
  WHERE workspace_id=? AND status='published'`)
    .get('workspace-b').n,
  1
)
assert.throws(
  () =>
    db
      .prepare(`UPDATE recruitment_applications SET stage='invalid' WHERE id='valid'`)
      .run(),
  /CHECK/
)
db.prepare(
  `UPDATE recruitment_applications SET stage='interview' WHERE id='valid'`
).run()
assert.equal(
  db.prepare('SELECT stage FROM recruitment_applications WHERE id=?').get('valid')
    .stage,
  'interview'
)

// The UI loads only bounded pages, but metrics must count ALL tenant rows.
for (let i = 0; i < 152; i++) {
  addJob(`more-job-${i}`, 'workspace-a')
}
for (let i = 0; i < 252; i++) {
  const candidate = `more-candidate-${i}`
  addCandidate(candidate, 'workspace-a')
  addApplication(`more-application-${i}`, 'workspace-a', 'a-live', candidate)
}
const visibleJobCount = db
  .prepare('SELECT id FROM recruitment_jobs WHERE workspace_id=? LIMIT 150')
  .all('workspace-a').length
const actualJobCount = db
  .prepare('SELECT count(*) AS n FROM recruitment_jobs WHERE workspace_id=?')
  .get('workspace-a').n
const visibleApplicationCount = db
  .prepare('SELECT id FROM recruitment_applications WHERE workspace_id=? LIMIT 250')
  .all('workspace-a').length
const actualApplicationCount = db
  .prepare('SELECT count(*) AS n FROM recruitment_applications WHERE workspace_id=?')
  .get('workspace-a').n
assert.equal(visibleJobCount, 150)
assert.equal(actualJobCount, 154)
assert.equal(visibleApplicationCount, 250)
assert.equal(actualApplicationCount, 253)

// A public job is NOT enough to enable public intake: opt-in table is empty.
assert.equal(
  db.prepare('SELECT COUNT(*) AS n FROM recruitment_application_settings').get().n,
  0
)
db.prepare(`INSERT INTO recruitment_application_settings
  (workspace_id,accept_applications,privacy_policy_url,updated_at)
  VALUES (?,?,?,?)`).run('workspace-a', 1, 'https://example.test/privacy', 'now')
const eligibleSql = `SELECT j.id FROM recruitment_jobs j
  JOIN workspaces w ON w.id=j.workspace_id
  JOIN recruitment_application_settings s ON s.workspace_id=w.id
  WHERE w.slug=? AND w.suspensionStatus='active' AND j.id=?
    AND j.status='published' AND s.accept_applications=1`
assert.equal(db.prepare(eligibleSql).all('workspace-a', 'a-live').length, 1)
db.prepare(
  "UPDATE workspaces SET suspensionStatus='suspended' WHERE id='workspace-a'"
).run()
assert.equal(db.prepare(eligibleSql).all('workspace-a', 'a-live').length, 0)
db.prepare(
  "UPDATE workspaces SET suspensionStatus='active' WHERE id='workspace-a'"
).run()
db.prepare('DELETE FROM recruitment_application_settings WHERE workspace_id=?').run(
  'workspace-a'
)

// An application key may be used only once per tenant, even across jobs.
db.prepare('UPDATE recruitment_applications SET submission_key=? WHERE id=?').run(
  'test-key-one',
  'valid'
)
assert.throws(
  () =>
    db
      .prepare(`INSERT INTO recruitment_applications
    (id,workspace_id,job_id,candidate_id,submission_key,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?)`)
      .run(
        'duplicate-token',
        'workspace-a',
        'a-live',
        'a-candidate',
        'test-key-one',
        'now',
        'now'
      ),
  /UNIQUE/
)

// Existing candidate index prevents concurrent contact identity reuse.
db.prepare(
  "UPDATE recruitment_candidates SET email='unique@example.test' WHERE id='a-candidate'"
).run()
assert.throws(
  () =>
    db
      .prepare(`INSERT INTO recruitment_candidates
    (id,workspace_id,full_name,email,phone,created_at) VALUES (?,?,?,?,?,?)`)
      .run(
        'duplicate-email',
        'workspace-a',
        'Other person',
        'unique@example.test',
        '',
        'now'
      ),
  /UNIQUE/
)

// Stage history is tenant bound and cannot attach to another workspace's app.
db.prepare(`INSERT INTO recruitment_stage_history
  (id,workspace_id,application_id,from_stage,to_stage,actor_user_id,created_at)
  VALUES (?,?,?,NULL,'new',NULL,?)`).run('stage-1', 'workspace-a', 'valid', 'now')
assert.throws(
  () =>
    db
      .prepare(`INSERT INTO recruitment_stage_history
    (id,workspace_id,application_id,from_stage,to_stage,actor_user_id,created_at)
    VALUES (?,?,?,'new','interview','actor','now')`)
      .run('cross-tenant-history', 'workspace-b', 'valid'),
  /FOREIGN KEY/
)
assert.equal(
  db
    .prepare('SELECT COUNT(*) AS n FROM recruitment_stage_history WHERE workspace_id=?')
    .get('workspace-a').n,
  1
)

// Rate limit counter should increment on the same key, not reset indefinitely.
db.prepare(
  'INSERT INTO recruitment_apply_rate_limits(key,hits,expires_at) VALUES (?,?,?)'
).run('hash-example', 1, 1000)
const hits = db
  .prepare(`INSERT INTO recruitment_apply_rate_limits(key,hits,expires_at)
  VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET
    hits=CASE WHEN expires_at <= ? THEN 1 ELSE hits+1 END,
    expires_at=CASE WHEN expires_at <= ? THEN excluded.expires_at ELSE expires_at END
  RETURNING hits`)
  .get('hash-example', 1000, 500, 500)
assert.equal(hits.hits, 2)

db.prepare('DELETE FROM workspaces WHERE id=?').run('workspace-a')
assert.equal(
  db
    .prepare('SELECT COUNT(*) as n FROM recruitment_jobs WHERE workspace_id=?')
    .get('workspace-a').n,
  0
)
assert.equal(
  db
    .prepare('SELECT COUNT(*) as n FROM recruitment_candidates WHERE workspace_id=?')
    .get('workspace-a').n,
  0
)
assert.equal(
  db
    .prepare('SELECT COUNT(*) as n FROM recruitment_applications WHERE workspace_id=?')
    .get('workspace-a').n,
  0
)
db.close()
