// Recruitment UX preview for Cloudflare Workers (separate from the TanStack app).
// ONLY synthetic data, password-protected dashboard, isolated D1 preview database.
// This is a lightweight runnable UX preview; the full SaaS repo remains a draft.
const noStore = {'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY'};
const json = (data,status=200) => new Response(JSON.stringify(data),{status,headers:{...noStore,'Content-Type':'application/json; charset=utf-8'}});
const escapeHtml = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const now = () => new Date().toISOString();
const label = s => String(s??'').trim();
async function hmac(value,secret) {
 const key = await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),'HMAC',false,['sign']);
 const sig = await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(value));
 return Array.from(new Uint8Array(sig)).map(x=>x.toString(16).padStart(2,'0')).join('');
}
function equal(a,b) { if(a.length!==b.length)return false;let x=0;for(let i=0;i<a.length;i++)x|=a.charCodeAt(i)^b.charCodeAt(i);return x===0; }
async function valid(request,env) {
 const token=(request.headers.get('Cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('ats_preview='))?.slice(12)||'';
 const match=/^(\d{13})\.([a-f0-9]{64})$/.exec(token);
 if(!match||!env.PREVIEW_PASSWORD) return false;
 const age=Date.now()-Number(match[1]);
 return age>=0 && age<=86400000 && equal(match[2],await hmac(match[1],env.PREVIEW_PASSWORD));
}
function responseHtml(body,nonce) {
 return new Response(body,{headers:{...noStore,'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"default-src 'none'; script-src 'nonce-"+nonce+"'; style-src 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; form-action 'self'; base-uri 'none'"}});
}
function frame(title,content,nonce,withClient=false) {
 const style = [
 ':root{color-scheme:light;font-family:system-ui,-apple-system,Segoe UI,Tahoma,sans-serif;color:#172b37;background:#f6f8fb}*{box-sizing:border-box}body{margin:0}button,input,select,textarea{font:inherit}button{cursor:pointer}button:disabled{opacity:.55;cursor:wait}',
 'a{text-decoration:none;color:inherit}h1,h2,h3,p{margin:0}.app{display:grid;grid-template-columns:242px 1fr;min-height:100vh}.side{background:#102b3b;color:#eef6fa;padding:27px 17px}.brand{display:flex;align-items:center;gap:11px;margin-bottom:37px;font-weight:800;font-size:21px}.brandmark{display:grid;place-items:center;width:40px;height:40px;background:#1cb39b;border-radius:13px;color:white;font-size:24px}.navitem{width:100%;display:flex;align-items:center;gap:10px;padding:13px 16px;border:0;border-radius:12px;color:#d4e1e7;background:transparent;text-align:start;margin-bottom:7px}.navitem.active,.navitem:hover{background:#254958;color:white}.sidebottom{margin-top:44px;padding:15px;color:#a4c1cc;font-size:12px;line-height:1.9;border-top:1px solid #37515b}.main{padding:27px max(26px,4vw) 70px;max-width:1550px;width:100%;margin:auto}.top{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:35px}.eyebrow{font-size:12px;color:#697d8a}.title{font-size:clamp(26px,3vw,39px);letter-spacing:-.6px;font-weight:820}.intro{color:#728593;margin-top:8px;font-size:14px}.heading{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:20px;margin-bottom:30px}.actions{display:flex;gap:10px;flex-wrap:wrap}.btn{border:1px solid #dbe4e9;border-radius:12px;padding:11px 16px;background:white;color:#243c47;font-weight:650;min-height:42px}.btn:hover{border-color:#31b59f}.btn.primary{background:#118e81;color:white;border-color:#118e81}.btn.primary:hover{background:#087f73}.btn.small{font-size:12px;padding:7px 10px;min-height:32px}.btn.ghost{background:transparent}.tiny{font-size:12px;color:#748594}.card{background:#fff;border:1px solid #e1e8ed;border-radius:19px;box-shadow:0 7px 28px rgba(17,49,66,.035)}.kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin:0 0 29px}.kpi{padding:22px}.kpi .mini{font-size:13px;color:#708391}.kpi b{font-size:30px;display:block;margin-top:16px}.panel{padding:21px}.paneltop{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:20px}.tabs{background:#f0f4f6;border-radius:12px;display:flex;padding:4px}.tab{border:0;border-radius:9px;background:transparent;padding:9px 18px;font-weight:650;color:#71828c}.tab.on{color:#1a3845;background:#fff;box-shadow:0 2px 6px #d9e5e8}.search{border:1px solid #dfe7eb;background:#fff;padding:11px 14px;border-radius:12px;min-width:230px;outline-color:#118e81}.filters{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:16px}.chip{border:1px solid #e1e8ed;background:#fff;color:#657785;border-radius:30px;padding:8px 13px;font-size:12px}.chip.on{background:#e4f8f4;color:#047c6f;border-color:#93d9ce}.listing{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px}.job{padding:18px;border:1px solid #e3ebee;border-radius:15px}.job:hover{border-color:#8bd5cb}.job h3{font-size:16px}.flex{display:flex;gap:9px;align-items:center;flex-wrap:wrap}.spaced{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.sep{border-top:1px solid #e8eef0;margin-top:20px;padding-top:14px}.tag{display:inline-block;border-radius:20px;padding:6px 10px;font-size:11px;font-weight:700;background:#f0f4f5;color:#73828b;white-space:nowrap}.tag.published{background:#e0f8ed;color:#117c53}.tag.closed{background:#fceaea;color:#bb6060}.info{color:#758692;font-size:12px;margin-top:9px}.rows{display:grid;gap:10px}.candidate{display:flex;align-items:center;justify-content:space-between;gap:15px;flex-wrap:wrap;padding:14px;border:1px solid #e5edf0;border-radius:13px}.avatar{width:45px;height:45px;border-radius:13px;background:#dbf6f0;color:#098677;display:grid;place-items:center;font-weight:800}.candleft{display:flex;align-items:center;gap:12px}.candleft strong{font-size:14px}.select{border:1px solid #dce6ea;border-radius:10px;padding:9px 12px;background:#fff;max-width:230px}.empty{text-align:center;padding:66px 18px;color:#748693}.empty h3{color:#234451;margin-bottom:10px}.notice{background:#e7f7f2;border:1px solid #a5e6d6;border-radius:12px;padding:13px 16px;margin-bottom:15px}.err{background:#ffefef;border-color:#ffcccc;color:#ab4545}.backdrop{position:fixed;inset:0;z-index:30;background:#0a2434a6;display:grid;place-items:center;padding:16px}.dialog{background:#fff;width:100%;max-width:530px;border-radius:22px;padding:28px;max-height:92vh;overflow:auto;box-shadow:0 25px 90px #0a223e35}.dialog h2{font-size:22px;margin-bottom:7px}.dialog form{margin-top:24px}.field{display:block;margin-bottom:16px}.field span{font-size:13px;font-weight:650;display:block;margin-bottom:7px}.field input,.field select,.field textarea{border:1px solid #d7e1e6;border-radius:11px;padding:12px;width:100%;outline-color:#0b9a8c;background:#fff;min-height:45px}.field textarea{min-height:100px}.dialogfooter{display:flex;justify-content:flex-end;gap:8px;margin-top:24px}.stack{display:grid;grid-template-columns:1fr 1fr;gap:13px}.muted{font-size:12px;color:#7c8b95}.access{min-height:100vh;display:grid;place-items:center;padding:20px;background:#f0f6f8}.login{max-width:425px;width:100%;background:white;border:1px solid #e3edf0;border-radius:22px;padding:34px;box-shadow:0 17px 50px #0b354017}.login h1{font-size:25px;margin:18px 0 11px}.login p{color:#71838d;line-height:1.8}.login input{display:block;width:100%;border:1px solid #cad8de;padding:15px;border-radius:11px;margin:20px 0 14px}.login button{width:100%}.previewtag{font-size:11px;padding:7px 10px;border-radius:30px;background:#fff3d7;color:#7f6528;font-weight:700}',
 '@media(max-width:1050px){.app{grid-template-columns:1fr}.side{display:flex;padding:14px 20px;align-items:center;gap:20px}.brand{margin:0;font-size:16px}.side nav{display:flex;gap:5px}.navitem{width:auto;margin:0;padding:8px 12px}.sidebottom{display:none}.kpis{grid-template-columns:repeat(2,1fr)}}@media(max-width:640px){.main{padding:24px 14px 60px}.top{margin-bottom:25px}.heading{align-items:flex-start}.heading .actions{width:100%}.heading .actions button{flex:1}.listing{grid-template-columns:1fr}.panel{padding:14px}.search{width:100%}.kpis{gap:9px}.kpi{padding:16px}.kpi b{font-size:26px}.side{padding:11px}.brand{font-size:14px}.navitem{font-size:12px}.stack{grid-template-columns:1fr}.dialog{padding:21px}.candidate{align-items:flex-start}}'
 ].join('');
 const script = withClient ? '<script nonce="'+nonce+'">('+clientApp.toString()+')()</script>' : '';
 return '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>'+escapeHtml(title)+'</title><style>'+style+'</style></head><body>'+content+script+'</body></html>';
}
function loginPage(error,nonce) {
 return frame('تجربة التوظيف | تسجيل الدخول',
 '<main class="access"><section class="login" dir="rtl"><div class="brandmark">✦</div><span class="previewtag">تجربة خاصة — بيانات افتراضية</span><h1>جرّب منصة التوظيف</h1><p>نسخة معاينة لتجربة الواجهة والوظائف. استخدم كلمة مرور التجربة.</p>'+
 (error?'<div class="notice err">كلمة المرور غير صحيحة</div>':'')+
 '<form method="post" action="/login"><label class="field"><span>كلمة المرور</span><input name="password" type="password" required autocomplete="off" maxlength="180"></label><button class="btn primary">الدخول للتجربة</button></form><p class="muted" style="margin-top:20px">لا تدخل بيانات حقيقية في النسخة التجريبية.</p></section></main>',nonce);
}
async function getTenant(db,slug){return db.prepare('SELECT id,name,slug FROM workspaces WHERE slug=? LIMIT 1').bind(slug).first();}
async function dashboard(db,slug) {
 const tenant=await getTenant(db,slug);
 if(!tenant)return null;
 const [jobs,applications]=await db.batch([
  db.prepare('SELECT id,title,department,location,employment_type,description,status,created_at FROM recruitment_jobs WHERE workspace_id=? ORDER BY created_at DESC LIMIT 150').bind(tenant.id),
  db.prepare('SELECT a.id,a.job_id,j.title AS job_title,a.stage,c.full_name,c.phone,c.email FROM recruitment_applications a JOIN recruitment_jobs j ON j.id=a.job_id AND j.workspace_id=a.workspace_id JOIN recruitment_candidates c ON c.id=a.candidate_id AND c.workspace_id=a.workspace_id WHERE a.workspace_id=? ORDER BY a.created_at DESC LIMIT 250').bind(tenant.id)
 ]);
 return {tenant,jobs:jobs.results,applications:applications.results};
}
async function mutate(db,data) {
 const tenant=await getTenant(db,data.tenant);
 if(!tenant)throw new Error('الشركة غير متاحة');
 const id=()=>crypto.randomUUID(), w=tenant.id,t=now(),action=data.action;
 const str=(key,max,required=false)=>{const value=label(data[key]);if(value.length>max||(required&&!value))throw new Error('بيانات غير صالحة: '+key);return value;};
 if(action==='createJob'||action==='editJob'){
  const title=str('title',150,true);
  if(title.length<3)throw new Error('المسمى الوظيفي قصير');
  const dept=str('department',100),loc=str('location',100),desc=str('description',10000);
  const type=str('employment_type',30)||'full_time';
  if(!['full_time','part_time','contract','internship'].includes(type))throw new Error('نوع الوظيفة غير صالح');
  if(action==='createJob')await db.prepare("INSERT INTO recruitment_jobs(id,workspace_id,title,department,location,employment_type,description,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,'draft',?,?)").bind(id(),w,title,dept,loc,type,desc,t,t).run();
  else await db.prepare('UPDATE recruitment_jobs SET title=?,department=?,location=?,employment_type=?,description=?,updated_at=? WHERE workspace_id=? AND id=?').bind(title,dept,loc,type,desc,t,w,str('jobId',70,true)).run();
 }else if(action==='status'){
  const status=str('status',15,true);if(!['draft','published','closed'].includes(status))throw new Error('حالة غير صالحة');
  await db.prepare('UPDATE recruitment_jobs SET status=?,updated_at=? WHERE workspace_id=? AND id=?').bind(status,t,w,str('jobId',70,true)).run();
 }else if(action==='addCandidate'){
  const name=str('full_name',150,true),phone=str('phone',40),email=str('email',250).toLowerCase();
  if(name.length<2||(!phone&&!email)||(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))throw new Error('ادخل الاسم وطريقة للتواصل');
  const jobId=str('jobId',70,true);
  const job=await db.prepare('SELECT id FROM recruitment_jobs WHERE id=? AND workspace_id=?').bind(jobId,w).first();
  if(!job)throw new Error('الوظيفة غير متاحة');
  const candidateId=id();
  await db.batch([
   db.prepare('INSERT INTO recruitment_candidates(id,workspace_id,full_name,email,phone,created_at) VALUES (?,?,?,?,?,?)').bind(candidateId,w,name,email,phone,t),
   db.prepare("INSERT INTO recruitment_applications(id,workspace_id,job_id,candidate_id,stage,created_at,updated_at) VALUES (?,?,?,?,'new',?,?)").bind(id(),w,jobId,candidateId,t,t)
  ]);
 }else if(action==='stage'){
  const stage=str('stage',30,true);
  if(!['new','screening','shortlisted','interview','offer','hired','rejected','withdrawn'].includes(stage))throw new Error('مرحلة غير صالحة');
  await db.prepare('UPDATE recruitment_applications SET stage=?,updated_at=? WHERE workspace_id=? AND id=?').bind(stage,t,w,str('applicationId',70,true)).run();
 }else throw new Error('إجراء غير معروف');
}
function clientApp() {
 const root=document.getElementById('root');
 const s={lang:'ar',tab:'jobs',filter:'all',search:'',tenant:'shownova',data:null,dialog:null,editing:null,message:'',error:''};
 const ar={app:'التوظيف',jobs:'الوظائف',candidates:'المرشحون',title:'التوظيف ببساطة',subtitle:'وظائفك ومرشحوك في مكان واحد بدون تعقيد.',newJob:'وظيفة جديدة',newCandidate:'إضافة مرشح',published:'وظائف منشورة',interviews:'في المقابلة',applications:'طلبات التوظيف',search:'ابحث عن وظيفة أو مرشح...',all:'الكل',draft:'مسودة',closed:'مغلقة',live:'منشورة',publish:'نشر',unpublish:'إيقاف النشر',edit:'تعديل',close:'إغلاق',new:'جديد',screening:'مراجعة أولية',shortlisted:'قائمة مختصرة',interview:'مقابلة',offer:'عرض وظيفي',hired:'تم التوظيف',rejected:'مرفوض',withdrawn:'انسحب',emptyJobs:'مفيش وظائف لسه',emptyCandidates:'مفيش مرشحين لسه',name:'الاسم',phone:'الجوال',email:'البريد الإلكتروني',job:'الوظيفة',stage:'المرحلة',titleField:'المسمى الوظيفي',department:'القسم',location:'المدينة',type:'نوع الدوام',description:'وصف الوظيفة',save:'حفظ',cancel:'إلغاء',view:'عرض الوظائف العامة',logout:'تسجيل الخروج'};
 const en={app:'Recruitment',jobs:'Jobs',candidates:'Candidates',title:'Hiring made simple',subtitle:'All your vacancies and candidates in one organized place.',newJob:'New job',newCandidate:'Add candidate',published:'Published',interviews:'In interviews',applications:'Applications',search:'Search jobs or candidates...',all:'All',draft:'Draft',closed:'Closed',live:'Published',publish:'Publish',unpublish:'Unpublish',edit:'Edit',close:'Close',new:'New',screening:'Screening',shortlisted:'Shortlisted',interview:'Interview',offer:'Offer',hired:'Hired',rejected:'Rejected',withdrawn:'Withdrawn',emptyJobs:'No jobs yet',emptyCandidates:'No candidates yet',name:'Name',phone:'Phone',email:'Email',job:'Job',stage:'Stage',titleField:'Job title',department:'Department',location:'Location',type:'Employment',description:'Job description',save:'Save',cancel:'Cancel',view:'View public careers',logout:'Log out'};
 const trans=()=>s.lang==='ar'?ar:en;
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const statusLabel=(v,t)=>v==='published'?t.live:v==='draft'?t.draft:t.closed;
 async function load(){
  try{const r=await fetch('/api/data?tenant='+encodeURIComponent(s.tenant));if(r.status===401){location.reload();return;}if(!r.ok)throw Error('تعذر تحميل البيانات');s.data=await r.json();render();}
  catch(err){s.error=err.message;render();}
 }
 async function send(body) {
  try{
   const jobs=s.data.jobs,apps=s.data.applications,action=body.action;
   if(action==='createJob'){
    const id='local-'+crypto.randomUUID();
    jobs.unshift({id,title:String(body.title||'').trim(),department:body.department||'',location:body.location||'',employment_type:body.employment_type||'full_time',description:body.description||'',status:'draft',created_at:new Date().toISOString()});
   }else if(action==='editJob'){
    const job=jobs.find(j=>j.id===body.jobId);if(!job)throw Error('Job not found');
    Object.assign(job,{title:body.title,department:body.department,location:body.location,employment_type:body.employment_type,description:body.description});
   }else if(action==='status'){
    const job=jobs.find(j=>j.id===body.jobId);if(!job)throw Error('Job not found');job.status=body.status;
   }else if(action==='addCandidate'){
    const job=jobs.find(j=>j.id===body.jobId);if(!job)throw Error('Job not found');
    if(!body.full_name||!(body.email||body.phone))throw Error('Please enter a name and contact');
    apps.unshift({id:'local-'+crypto.randomUUID(),job_id:job.id,job_title:job.title,full_name:body.full_name,phone:body.phone||'',email:body.email||'',stage:'new'});
   }else if(action==='stage'){
    const applicant=apps.find(a=>a.id===body.applicationId);if(!applicant)throw Error('Application not found');applicant.stage=body.stage;
   }
   s.dialog=null;s.editing=null;s.error='';
   s.message=s.lang==='ar'?'تم التعديل داخل المتصفح للتجربة فقط — لن يُحفظ على السيرفر.':'Demo updated locally in this browser tab only.';
   render();
  }catch(err){s.error=String(err.message||'Unable to update');render();}
 }
 function jobCard(j,t){
  const count=s.data.applications.filter(a=>a.job_id===j.id).length;
  return '<article class="job"><div class="spaced"><div><h3>'+esc(j.title)+'</h3><div class="info">'+esc([j.department,j.location].filter(Boolean).join(' • '))+'</div></div><span class="tag '+esc(j.status)+'">'+esc(statusLabel(j.status,t))+'</span></div>'+
   (j.description?'<p class="info" style="line-height:1.8;margin-top:16px">'+esc(j.description.slice(0,125))+'</p>':'')+
   '<div class="sep spaced"><span class="tiny">'+count+' '+esc(t.applications)+'</span><div class="flex">'+
   '<button class="btn small" data-action="editJob" data-id="'+esc(j.id)+'">'+esc(t.edit)+'</button>'+
   (j.status!=='closed'?'<button class="btn small" data-action="status" data-id="'+esc(j.id)+'" data-value="'+(j.status==='published'?'draft':'published')+'">'+esc(j.status==='published'?t.unpublish:t.publish)+'</button><button class="btn small ghost" data-action="status" data-id="'+esc(j.id)+'" data-value="closed">'+esc(t.close)+'</button>':'<button class="btn small" data-action="status" data-id="'+esc(j.id)+'" data-value="draft">'+esc(t.draft)+'</button>')+
   '</div></div></article>';
 }
 function candidateCard(a,t){
  const stages=['new','screening','shortlisted','interview','offer','hired','rejected','withdrawn'];
  return '<article class="candidate"><div class="candleft"><div class="avatar">'+esc(a.full_name.slice(0,1))+'</div><div><strong>'+esc(a.full_name)+'</strong><p class="info">'+esc(a.job_title)+'</p><p class="info" dir="ltr">'+esc(a.phone||a.email)+'</p></div></div><label class="flex tiny">'+esc(t.stage)+' <select class="select" data-stage="'+esc(a.id)+'">'+stages.map(v=>'<option value="'+v+'"'+(a.stage===v?' selected':'')+'>'+esc(t[v])+'</option>').join('')+'</select></label></article>';
 }
 function paintList() {
  if(!s.data)return;
  const t=trans(),q=s.search.toLocaleLowerCase();
  const area=document.getElementById('listing');if(!area)return;
  if(s.tab==='jobs'){
   const jobs=s.data.jobs.filter(j=>(s.filter==='all'||j.status===s.filter)&&[j.title,j.department,j.location].join(' ').toLocaleLowerCase().includes(q));
   area.innerHTML='<div class="filters">'+['all','published','draft','closed'].map(v=>'<button class="chip '+(s.filter===v?'on':'')+'" data-action="filter" data-value="'+v+'">'+esc(v==='all'?t.all:statusLabel(v,t))+'</button>').join('')+'</div>'+ (jobs.length?'<div class="listing">'+jobs.map(j=>jobCard(j,t)).join('')+'</div>':'<div class="empty"><h3>'+esc(t.emptyJobs)+'</h3><p>✦</p></div>');
  }else{
   const candidates=s.data.applications.filter(a=>[a.full_name,a.phone,a.email,a.job_title].join(' ').toLocaleLowerCase().includes(q));
   area.innerHTML=candidates.length?'<div class="rows">'+candidates.map(a=>candidateCard(a,t)).join('')+'</div>':'<div class="empty"><h3>'+esc(t.emptyCandidates)+'</h3></div>';
  }
 }
 function render() {
  const t=trans();
  document.documentElement.lang=s.lang==='ar'?'ar':'en';
  document.documentElement.dir=s.lang==='ar'?'rtl':'ltr';
  if(!s.data){root.innerHTML='<div style="padding:50px">'+esc(s.error||'Loading...')+'</div>';return;}
  const j=s.data.jobs,a=s.data.applications;
  const counts=[[t.jobs,j.length,'▣'],[t.published,j.filter(x=>x.status==='published').length,'✓'],[t.applications,a.length,'♧'],[t.interviews,a.filter(x=>x.stage==='interview').length,'◷']];
  root.innerHTML='<div class="app"><aside class="side"><div class="brand"><span class="brandmark">✦</span><span>HireFlow <small style="font-size:9px;color:#86dacd">DEMO</small></span></div><nav><button class="navitem '+(s.tab==='jobs'?'active':'')+'" data-action="tab" data-value="jobs">▣ '+esc(t.jobs)+'</button><button class="navitem '+(s.tab==='candidates'?'active':'')+'" data-action="tab" data-value="candidates">♧ '+esc(t.candidates)+'</button></nav><div class="sidebottom">نسخة تجريبية مستقلة. البيانات افتراضية.<br>Built on Cloudflare Workers + D1</div></aside>'+
  '<main class="main"><div class="top"><div><p class="eyebrow">'+esc(s.data.tenant.name)+' / ATS</p></div><div class="flex"><span class="previewtag">Preview · Test data only</span><button class="btn small" data-action="language">'+(s.lang==='ar'?'EN':'AR')+'</button><form method="post" action="/logout"><button class="btn small" type="submit">'+esc(t.logout)+'</button></form></div></div>'+
  '<div class="heading"><div><h1 class="title">'+esc(t.title)+'</h1><p class="intro">'+esc(t.subtitle)+'</p></div><div class="actions"><button class="btn" data-action="newCandidate">＋ '+esc(t.newCandidate)+'</button><button class="btn primary" data-action="newJob">＋ '+esc(t.newJob)+'</button></div></div>'+
  '<div class="flex" style="margin-bottom:20px"><label class="tiny">'+(s.lang==='ar'?'الشركة':'Company')+'</label><select id="company" class="select"><option value="shownova"'+(s.tenant==='shownova'?' selected':'')+'>Shownova (Demo)</option><option value="aqar1"'+(s.tenant==='aqar1'?' selected':'')+'>Aqar One (Demo)</option></select><a target="_blank" href="/careers/'+encodeURIComponent(s.tenant)+'" class="btn small">'+esc(t.view)+' ↗</a></div>'+
  '<section class="kpis">'+counts.map(x=>'<div class="card kpi"><div class="spaced"><span class="mini">'+esc(x[0])+'</span><span class="mini">'+x[2]+'</span></div><b>'+x[1]+'</b></div>').join('')+'</section>'+
  (s.message?'<div class="notice">'+esc(s.message)+'</div>':'')+(s.error?'<div class="notice err">'+esc(s.error)+'</div>':'')+
  '<section class="card panel"><div class="paneltop"><div class="tabs"><button class="tab '+(s.tab==='jobs'?'on':'')+'" data-action="tab" data-value="jobs">'+esc(t.jobs)+'</button><button class="tab '+(s.tab==='candidates'?'on':'')+'" data-action="tab" data-value="candidates">'+esc(t.candidates)+'</button></div><input class="search" id="search" placeholder="'+esc(t.search)+'" value="'+esc(s.search)+'" aria-label="'+esc(t.search)+'"></div><div id="listing"></div></section></main></div><div id="modal"></div>';
  document.getElementById('company').onchange=e=>{s.tenant=e.target.value;s.search='';s.filter='all';s.message='';s.error='';void load();};
  document.getElementById('search').oninput=e=>{s.search=e.target.value;paintList();};
  paintList();if(s.dialog)paintDialog();
 }
 function paintDialog(){
  const t=trans(),job=s.editing||{},isJob=s.dialog==='job';
  const field=(key,title,value,type='text',required=false)=>'<label class="field"><span>'+esc(title)+'</span><input name="'+key+'" type="'+type+'" value="'+esc(value||'')+'"'+(required?' required':'')+' maxlength="180"></label>';
  let html='';
  if(isJob){
   html=field('title',t.titleField+' *',job.title,'text',true)+
   '<div class="stack">'+field('department',t.department,job.department)+field('location',t.location,job.location)+'</div>'+
   '<label class="field"><span>'+esc(t.type)+'</span><select name="employment_type">'+[['full_time','دوام كامل'],['part_time','دوام جزئي'],['contract','عقد'],['internship','تدريب']].map(v=>'<option value="'+v[0]+'"'+((job.employment_type||'full_time')===v[0]?' selected':'')+'>'+v[1]+'</option>').join('')+'</select></label>'+
   '<label class="field"><span>'+esc(t.description)+'</span><textarea maxlength="10000" name="description">'+esc(job.description||'')+'</textarea></label>';
  }else{
   html=field('full_name',t.name+' *','','text',true)+
   '<label class="field"><span>'+esc(t.job)+'</span><select name="jobId" required>'+s.data.jobs.map(j=>'<option value="'+esc(j.id)+'">'+esc(j.title)+'</option>').join('')+'</select></label>'+
   '<div class="stack">'+field('phone',t.phone,'','tel')+field('email',t.email,'','email')+'</div>';
  }
  document.getElementById('modal').innerHTML='<div class="backdrop" id="backdrop"><div class="dialog" role="dialog" aria-modal="true"><h2>'+esc(isJob?t.newJob:t.newCandidate)+'</h2><p class="muted">'+(s.lang==='ar'?'خطوات أقل، إنجاز أسرع.':'Minimal steps, faster hiring.')+'</p><form id="entryform">'+html+'<div class="dialogfooter"><button type="button" class="btn" data-action="cancel">'+esc(t.cancel)+'</button><button class="btn primary" type="submit">'+esc(t.save)+'</button></div></form></div></div>';
  document.getElementById('entryform').onsubmit=e=>{
   e.preventDefault();
   const values=Object.fromEntries(new FormData(e.target).entries());
   if(isJob)void send({...values,action:s.editing?'editJob':'createJob',jobId:s.editing?.id});
   else void send({...values,action:'addCandidate'});
  };
 }
 root.addEventListener('click',e=>{
  const el=e.target.closest('[data-action]');if(!el)return;
  const action=el.dataset.action,value=el.dataset.value,id=el.dataset.id;
  if(action==='tab'){s.tab=value;s.search='';render();}
  if(action==='filter'){s.filter=value;paintList();}
  if(action==='language'){s.lang=s.lang==='ar'?'en':'ar';render();}
  if(action==='reset'){s.dialog=null;s.editing=null;s.message='';s.error='';void load();}
  if(action==='newJob'){s.dialog='job';s.editing=null;paintDialog();}
  if(action==='newCandidate'){if(!s.data.jobs.length){s.error='أضف وظيفة أولاً';render();return;}s.dialog='candidate';s.editing=null;paintDialog();}
  if(action==='editJob'){s.dialog='job';s.editing=s.data.jobs.find(x=>x.id===id);paintDialog();}
  if(action==='status'){void send({action:'status',jobId:id,status:value});}
  if(action==='cancel'){s.dialog=null;document.getElementById('modal').innerHTML='';}
 });
 root.addEventListener('change',e=>{if(e.target.matches('[data-stage]'))void send({action:'stage',applicationId:e.target.dataset.stage,stage:e.target.value});});
 document.addEventListener('click',e=>{if(e.target.id==='backdrop'){s.dialog=null;document.getElementById('modal').innerHTML='';}});
 void load();
}
export default {
 async fetch(request,env) {
  const url=new URL(request.url),nonce=crypto.randomUUID().replace(/-/g,'');
  if(request.method==='GET'&&url.pathname.startsWith('/careers/')) {
   const slug=url.pathname.split('/')[2];
   const tenant=await getTenant(env.DB,slug);
   const rows=tenant?await env.DB.prepare("SELECT title,location,department,description FROM recruitment_jobs WHERE workspace_id=? AND status='published' ORDER BY created_at DESC").bind(tenant.id).all():{results:[]};
   const cards=rows.results.map(j=>'<article class="card" style="padding:22px;margin-top:14px"><h2>'+escapeHtml(j.title)+'</h2><p class="info">'+escapeHtml([j.location,j.department].filter(Boolean).join(' • '))+'</p><p style="line-height:2;margin-top:15px">'+escapeHtml(j.description)+'</p><p class="muted" style="margin-top:20px">التقديم من الموقع قيد التطوير.</p></article>').join('');
   return responseHtml(frame('Careers', '<main style="max-width:860px;margin:50px auto;padding:20px" dir="rtl"><a class="btn" href="/">↩ الرجوع</a><h1 style="font-size:35px;margin:35px 0 12px">الوظائف المتاحة — '+escapeHtml(tenant?.name||'')+'</h1><p class="muted">الصفحة التجريبية تعرض الوظائف المنشورة فقط.</p>'+(cards||'<div class="empty">لا توجد وظائف حاليًا</div>')+'</main>',nonce),nonce);
  }
  if(request.method==='GET'&&url.pathname==='/health') return json({status:'ok',environment:'recruitment-ux-public-demo',database:'isolated D1',data:'synthetic'});
  if(request.method==='GET'&&url.pathname==='/api/data') {
   const slug=label(url.searchParams.get('tenant')||'shownova');
   if(!['shownova','aqar1'].includes(slug))return json({error:'not_found'},404);
   const data=await dashboard(env.DB,slug);return data?json(data):json({error:'not_found'},404);
  }
  if(request.method==='GET'&&(url.pathname==='/'||url.pathname==='/index.html'))return responseHtml(frame('HireFlow Recruitment UX Demo','<div id="root"></div>',nonce,true),nonce);
  if(request.method==='POST')return json({error:'Read-only public demo: server writes are disabled'},403);
  return new Response('Not found',{status:404,headers:noStore});
 }
};
