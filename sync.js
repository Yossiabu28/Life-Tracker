const LT=(()=>{
const C=window.LT_CONFIG||{},ok=!!(C.url&&C.key&&!/PASTE/.test(C.url+C.key));
let sess=null,busy=false,tm=null,msg='';
try{sess=JSON.parse(localStorage.getItem('lt-sess'))}catch(e){}
msg=!ok?'':sess?'מחובר לסנכרון':'לא מחובר לסנכרון';
const setS=s=>{sess=s;try{s?localStorage.setItem('lt-sess',JSON.stringify(s)):localStorage.removeItem('lt-sess')}catch(e){}};
const ss=(m,e)=>{msg=m;const x=document.getElementById('sy');if(x){x.textContent=m;x.style.color=e?'var(--er)':''}};
const keep=r=>({at:r.access_token,rt:r.refresh_token,exp:r.expires_at||Math.floor(Date.now()/1000)+(r.expires_in||3600),uid:r.user.id,email:r.user.email});
async function auth(p,b){const r=await fetch(C.url+'/auth/v1/'+p,{method:'POST',headers:{apikey:C.key,'Content-Type':'application/json'},body:JSON.stringify(b)});const j=await r.json().catch(()=>({}));if(!r.ok)throw Object.assign(new Error(j.error_description||j.msg||j.message||'שגיאת התחברות'),{srv:1});return j}
async function refresh(){try{setS(keep(await auth('token?grant_type=refresh_token',{refresh_token:sess.rt})))}catch(e){if(e.srv){setS(null);throw new Error('נדרשת התחברות מחדש')}throw e}}
async function api(p,o,re){o=o||{};if(sess.exp-60<Date.now()/1000)await refresh();
const r=await fetch(C.url+p,{method:o.method||'GET',body:o.body,headers:Object.assign({apikey:C.key,Authorization:'Bearer '+sess.at,'Content-Type':'application/json'},o.headers||{})});
if(r.status===401&&!re){await refresh();return api(p,o,1)}
if(!r.ok)throw new Error((await r.text()).slice(0,160));const t=await r.text();return t?JSON.parse(t):null}
async function sync(){
if(!ok||!sess||busy)return;if(!navigator.onLine){ss('אין חיבור. יסונכרן כשיחזור.');return}
busy=true;ss('מסנכרן…');
try{
if(tmr){clearTimeout(tmr);await save()}
const rows=await api('/rest/v1/tracker_data?select=kind,key,data'),ST={day:'days',goal:'goals'};
const L={day:Object.fromEntries(days.map(d=>[d.date,d])),goal:Object.fromEntries(goals.map(g=>[g.id,g]))};
const seen={},push=[],pd=[],dd=[],P=(k,key,data)=>push.push({user_id:sess.uid,kind:k,key,data});
for(const r of rows){const k=r.kind,key=r.key,d=r.data||{},rt=d.updatedAt||0,l=L[k]&&L[k][key],lt=l?l.updatedAt||0:0,tb=meta['tomb:'+k+':'+key]||0;seen[k+'|'+key]=1;
if(!ST[k])continue;
if(d.deleted){if(l){if(lt<=rt)dd.push([ST[k],key]);else P(k,key,l)}}
else if(tb>rt)P(k,key,{deleted:true,updatedAt:tb});
else if(rt>lt)pd.push([ST[k],d]);
else if(lt>rt)P(k,key,l)}
for(const k of['day','goal'])for(const key in L[k])if(!seen[k+'|'+key])P(k,key,L[k][key]);
const ch=pd.length+dd.length;
if(ch)await tx(['days','goals'],'readwrite',t=>{pd.forEach(([s,o])=>t.objectStore(s).put(o));dd.forEach(([s,k])=>t.objectStore(s).delete(k))});
for(let i=0;i<push.length;i+=200)await api('/rest/v1/tracker_data?on_conflict=user_id,kind,key',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(push.slice(i,i+200))});
if(ch){await loadAll();if(!tmr){rec=days.find(d=>d.date===cur)||blank(cur);const a=document.activeElement;if(!(a&&/INPUT|TEXTAREA|SELECT/.test(a.tagName)))render()}}
ss('מסונכרן ✓ '+new Date().toLocaleTimeString('he-IL',{hour:'2-digit',minute:'2-digit'}));
}catch(e){ss('הסנכרון נכשל: '+e.message+'. הנתונים בטוחים במכשיר.',1)}
busy=false}
const sched=()=>{if(!ok||!sess)return;clearTimeout(tm);tm=setTimeout(sync,2000)};
async function tomb(k,key){const v=Date.now();await put('meta',{k:'tomb:'+k+':'+key,v});meta['tomb:'+k+':'+key]=v}
async function prep(D,G){if(!ok||!sess)return;const n=Date.now();D.forEach(d=>d.updatedAt=n);G.forEach(g=>g.updatedAt=n);const kd=new Set(D.map(d=>d.date)),kg=new Set(G.map(g=>g.id));for(const d of days)if(!kd.has(d.date))await tomb('day',d.date);for(const g of goals)if(!kg.has(g.id))await tomb('goal',g.id)}
async function act(a){
if(a==='ltsync')return sync();
if(a==='ltout'){setS(null);ss('מנותק');return render()}
const e=document.getElementById('lte').value.trim(),p=document.getElementById('ltp').value;
if(!e||p.length<6){toast('הזינו מייל וסיסמה (6 תווים לפחות)',1);return}
try{const j=await auth(a==='ltup'?'signup':'token?grant_type=password',{email:e,password:p});
if(!j.access_token){toast('נשלח מייל לאישור. אשרו אותו ואז התחברו.');return}
setS(keep(j));toast('מחוברים. מסנכרן…');render();sync()}catch(er){toast(er.message,1)}}
const ui=()=>{
if(!ok)return '<div class="c"><h2>סנכרון ענן</h2><p class="mu" style="margin:0">הסנכרון עדיין לא הוגדר, והאפליקציה עובדת במכשיר בלבד. ראו את המדריך (קובץ config.js).</p></div>';
if(!sess)return '<div class="c"><h2>סנכרון ענן</h2><label>מייל<input id="lte" type="email" autocomplete="username"></label><label style="margin-top:8px">סיסמה<input id="ltp" type="password" autocomplete="current-password"></label><div class="r" style="margin-top:10px"><button data-a="ltin">התחברות</button><button class="s" data-a="ltup">יצירת חשבון</button></div><small>הנתונים נשמרים גם במכשיר וגם בענן, ומתעדכנים בכל המכשירים שמחוברים לאותו חשבון.</small></div>';
return `<div class="c"><h2>סנכרון ענן</h2><p style="margin:0">מחובר: ${esc(sess.email)}</p><small id="sy">${esc(msg)}</small><div class="r" style="margin-top:10px"><button data-a="ltsync">סנכרן עכשיו</button><button class="d" data-a="ltout">התנתקות</button></div><small>ההתנתקות לא מוחקת נתונים מהמכשיר או מהענן.</small></div>`};
function start(){if(ok&&sess){sync();setInterval(()=>{if(!document.hidden)sync()},90000)}addEventListener('online',sync);document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync()})}
return{on:()=>ok&&!!sess,sched,tomb,prep,ui,act,start,msg:()=>msg}})();
