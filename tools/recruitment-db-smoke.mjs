// Run: node tools/recruitment-db-smoke.mjs
// Dependency-free smoke test: exercises the committed SQLite/D1 migration.
import { strict as assert } from 'node:assert'
import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const migration = fileURLToPath(new URL('../packages/db/migrations/20261102173000_recruitment_mvp/migration.sql', import.meta.url))
const db = new DatabaseSync(':memory:')
db.exec('PRAGMA foreign_keys=ON')
db.exec('CREATE TABLE workspaces (id TEXT PRIMARY KEY)')
db.prepare('INSERT INTO workspaces(id) VALUES (?)').run('workspace-a')
db.prepare('INSERT INTO workspaces(id) VALUES (?)').run('workspace-b')
db.exec(readFileSync(migration, 'utf8'))

function addJob(id, workspaceId, status = 'draft') {
  db.prepare(`INSERT INTO recruitment_jobs
    (id,workspace_id,title,status,created_at,updated_at)
    VALUES (?,?,?,?,?,?)`).run(id,workspaceId,id,status,'now','now')
}
function addCandidate(id, workspaceId) {
  db.prepare(`INSERT INTO recruitment_candidates
    (id,workspace_id,full_name,created_at) VALUES (?,?,?,?)`)
    .run(id,workspaceId,'Candidate','now')
}
function addApplication(id, workspaceId, jobId, candidateId) {
  db.prepare(`INSERT INTO recruitment_applications
    (id,workspace_id,job_id,candidate_id,created_at,updated_at)
    VALUES (?,?,?,?,?,?)`)
    .run(id,workspaceId,jobId,candidateId,'now','now')
}

addJob('a-draft','workspace-a')
addJob('a-live','workspace-a','published')
addJob('b-live','workspace-b','published')
addCandidate('a-candidate','workspace-a')
addCandidate('b-candidate','workspace-b')

assert.throws(
  () => addApplication('cross-candidate','workspace-a','a-live','b-candidate'),
  /FOREIGN KEY/
)
assert.throws(
  () => addApplication('cross-job','workspace-a','b-live','a-candidate'),
  /FOREIGN KEY/
)
addApplication('valid','workspace-a','a-live','a-candidate')
assert.equal(db.prepare('SELECT COUNT(*) as n FROM recruitment_applications WHERE workspace_id=?').get('workspace-a').n,1)
assert.equal(db.prepare('SELECT COUNT(*) as n FROM recruitment_applications WHERE workspace_id=?').get('workspace-b').n,0)
assert.equal(db.prepare(`SELECT COUNT(*) as n FROM recruitment_jobs
  WHERE workspace_id=? AND status='published'`).get('workspace-a').n,1)
assert.equal(db.prepare(`SELECT COUNT(*) as n FROM recruitment_jobs
  WHERE workspace_id=? AND status='published'`).get('workspace-b').n,1)
assert.throws(() => db.prepare(`UPDATE recruitment_applications SET stage='invalid' WHERE id='valid'`).run(), /CHECK/)
db.prepare(`UPDATE recruitment_applications SET stage='interview' WHERE id='valid'`).run()
assert.equal(db.prepare('SELECT stage FROM recruitment_applications WHERE id=?').get('valid').stage,'interview')

db.prepare('DELETE FROM workspaces WHERE id=?').run('workspace-a')
assert.equal(db.prepare('SELECT COUNT(*) as n FROM recruitment_jobs WHERE workspace_id=?').get('workspace-a').n,0)
assert.equal(db.prepare('SELECT COUNT(*) as n FROM recruitment_candidates WHERE workspace_id=?').get('workspace-a').n,0)
assert.equal(db.prepare('SELECT COUNT(*) as n FROM recruitment_applications WHERE workspace_id=?').get('workspace-a').n,0)
db.close()
console.log('PASS: migration, cross-tenant foreign keys, publish isolation, stage check, cascade deletion')
