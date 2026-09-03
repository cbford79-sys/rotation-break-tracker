/* Rotation Break Tracker enhancements v8: roster order, attendance, coverage */
(()=>{
  const ATTENDANCE_KEY='rotationAttendanceV1';
  const STATUSES=['Present','AWOL','Vacation','Personal','Call-In','Other'];
  let attendance=JSON.parse(localStorage.getItem(ATTENDANCE_KEY)||'{}');
  const baseSave=save;
  save=function(){baseSave();localStorage.setItem(ATTENDANCE_KEY,JSON.stringify(attendance));};

  const css=`
  .shift-overview{margin-bottom:14px}.overview-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:9px}.overview-item{background:#0f172a;border:1px solid #334155;border-radius:14px;padding:10px}.overview-item b{display:block;font-size:1.25rem}.overview-item span{font-size:.72rem;color:var(--muted)}
  .member.absent{border-color:#7f1d1d;background:#291719}.coverage{background:#0f172a;border:1px solid #334155;border-radius:14px;padding:10px;line-height:1.4}.coverage strong{color:#fcd34d}.coverage-list{display:grid;gap:8px;margin-top:12px}.coverage-card{background:var(--panel2);border:1px solid var(--border);border-radius:14px;padding:11px;display:flex;justify-content:space-between;gap:10px}.coverage-card .arrow{color:#fcd34d;font-weight:900}.order-badge{min-width:34px;height:34px;border-radius:10px;display:inline-grid;place-items:center;background:#0f172a;border:1px solid #334155;font-weight:900;margin-right:8px}.removed{opacity:.6}.attendance-label{font-size:.72rem;color:var(--muted);font-weight:800}.manage-row button:disabled{opacity:.35}.member select{margin-top:0}@media(max-width:650px){.overview-grid{grid-template-columns:1fr 1fr}.coverage-card{flex-direction:column}}
  `;
  const style=document.createElement('style');style.textContent=css;document.head.appendChild(style);

  const teamSection=$('#team');
  if(teamSection && !$('#shiftOverview')){
    const wrap=document.createElement('div');wrap.id='shiftOverview';wrap.className='panel shift-overview';
    wrap.innerHTML=`<div class="panel-title"><div><h2>Shift Overview</h2><div class="muted small" id="attendanceDateLabel"></div></div></div><div class="overview-grid"><div class="overview-item"><span>Present</span><b id="presentCount">0</b></div><div class="overview-item"><span>Unavailable</span><b id="absentCount">0</b></div><div class="overview-item"><span>Jobs Covered</span><b id="coveredCount">0</b></div><div class="overview-item"><span>Need Coverage</span><b id="uncoveredCount">0</b></div></div><div id="coverageList" class="coverage-list"></div>`;
    teamSection.prepend(wrap);
  }

  const managePanel=$('#manage .panel');
  if(managePanel){
    const h2=managePanel.querySelector('h2');
    if(h2 && !managePanel.querySelector('.roster-note')){
      const note=document.createElement('div');note.className='muted small roster-note';note.textContent='Roster order controls automatic coverage order.';h2.insertAdjacentElement('afterend',note);
    }
  }

  function activeTeam(){return team.filter(m=>m.active!==false);}
  function getAttendance(id,date=localDateKey()){return attendance[date]?.[id]||'Present';}
  function isAvailable(id,date=localDateKey()){const m=getMember(id);return !!m&&m.active!==false&&getAttendance(id,date)==='Present';}
  function nextAvailableOperator(id){const roster=activeTeam(),start=roster.findIndex(m=>m.id===id);if(start<0||roster.length<2)return null;for(let n=1;n<roster.length;n++){const c=roster[(start+n)%roster.length];if(isAvailable(c.id))return c;}return null;}
  window.setAttendance=function(id,status){if(!STATUSES.includes(status))status='Present';const date=localDateKey();attendance[date]=attendance[date]||{};attendance[date][id]=status;if(status!=='Present'&&activeBreaks[id])delete activeBreaks[id];save();render();};
  function attendanceSelect(m){const current=getAttendance(m.id);return `<div><div class="attendance-label">TODAY'S ATTENDANCE</div><select onchange="setAttendance('${m.id}',this.value)">${STATUSES.map(s=>`<option ${s===current?'selected':''}>${s}</option>`).join('')}</select></div>`;}

  const originalStartBreak=startBreak;
  startBreak=function(id){const m=getMember(id);if(!isAvailable(id))return alert(`${m?.name||'This team member'} is marked ${getAttendance(id)} and cannot be started on break.`);originalStartBreak(id);};

  window.moveMember=function(id,dir){const idx=team.findIndex(m=>m.id===id);if(idx<0)return;let target=idx+dir;while(target>=0&&target<team.length&&team[target].active===false)target+=dir;if(target<0||target>=team.length)return;[team[idx],team[target]]=[team[target],team[idx]];save();render();};
  window.removeMember=function(id){const m=getMember(id);if(!m)return;if(confirm(`Remove ${m.name} from the active roster? Their old history will be kept.`)){m.active=false;delete activeBreaks[id];save();render();}};
  window.restoreMember=function(id){const m=getMember(id);if(!m)return;m.active=true;save();render();};

  renderTeam=function(){
    $('#teamGrid').innerHTML=activeTeam().map(m=>{const a=activeBreaks[m.id],att=getAttendance(m.id),present=att==='Present',next=present?null:nextAvailableOperator(m.id);return `<div class="member ${present?'':'absent'}"><div class="member-top"><div class="name">${escapeHtml(m.name)}</div><span class="status">${a?'OUT':present?'AVAILABLE':escapeHtml(att).toUpperCase()}</span></div>${m.crew?crewBadge(m.crew):''}<div class="job-badge">Job: ${escapeHtml(m.job||'Not assigned')}</div>${attendanceSelect(m)}${present?(a?`<div class="rot">Left rotation: <b>${a.startRotation}</b></div>`:'<div class="muted">Ready</div>'):`<div class="coverage"><div>${escapeHtml(att)}</div><strong>${next?'Next operator: '+escapeHtml(next.name):'No available operator'}</strong></div>`}${present?`<button class="primary" onclick="${a?`endBreak('${m.id}')`:`startBreak('${m.id}')`}">${a?'RETURN':'START BREAK'}</button>`:''}</div>`;}).join('')||'<div class="empty">Add team members under Manage.</div>';
  };

  function renderOverview(){const roster=activeTeam(),present=roster.filter(m=>isAvailable(m.id)),absent=roster.filter(m=>!isAvailable(m.id)),coverage=absent.map(m=>({m,next:nextAvailableOperator(m.id)}));$('#presentCount').textContent=present.length;$('#absentCount').textContent=absent.length;$('#coveredCount').textContent=coverage.filter(x=>x.next).length;$('#uncoveredCount').textContent=coverage.filter(x=>!x.next).length;$('#attendanceDateLabel').textContent='Attendance · '+new Date().toLocaleDateString(undefined,{weekday:'long',month:'short',day:'numeric'});$('#coverageList').innerHTML=coverage.length?coverage.map(({m,next})=>`<div class="coverage-card"><div><b>${escapeHtml(m.job||'Unassigned job')}</b><div class="muted small">${escapeHtml(m.name)} · ${escapeHtml(getAttendance(m.id))}</div></div><div class="arrow">${next?`Next: ${escapeHtml(next.name)} ➜`:'NO AVAILABLE OPERATOR'}</div></div>`).join(''):'<div class="muted small">Full crew available. No coverage changes needed.</div>';}

  renderManage=function(){const roster=activeTeam(),removed=team.filter(m=>m.active===false);$('#memberList').innerHTML=roster.map((m,i)=>`<div class="manage-row"><div><span class="order-badge">${i+1}</span><b>${escapeHtml(m.name)}</b>${m.crew?crewBadge(m.crew):''}</div><div class="muted small" style="margin-top:5px">Job: ${escapeHtml(m.job||'Not assigned')} · Today: ${escapeHtml(getAttendance(m.id))}</div><div class="toolbar" style="margin-top:8px"><button class="secondary" onclick="moveMember('${m.id}',-1)" ${i===0?'disabled':''}>↑ Up</button><button class="secondary" onclick="moveMember('${m.id}',1)" ${i===roster.length-1?'disabled':''}>↓ Down</button><button class="secondary" onclick="changeCrew('${m.id}')">Change Crew</button><button class="secondary" onclick="changeJob('${m.id}')">Change Job</button><button class="danger" onclick="removeMember('${m.id}')">Delete</button></div></div>`).join('')+(removed.length?`<div class="muted small" style="margin:14px 0 4px">REMOVED TEAM MEMBERS</div>${removed.map(m=>`<div class="manage-row removed"><b>${escapeHtml(m.name)}</b>${m.crew?crewBadge(m.crew):''}<div class="muted small">History retained</div><div class="toolbar" style="margin-top:8px"><button class="secondary" onclick="restoreMember('${m.id}')">Restore</button></div></div>`).join('')}`:'');};

  window.exportAttendanceCSV=function(){const rows=[['Date','Team Member','Job','Attendance']];Object.keys(attendance).sort().forEach(date=>team.forEach(m=>rows.push([date,m.name,m.job,attendance[date]?.[m.id]||'Present'])));downloadBlob(makeCSV(rows),'rotation-attendance-history.csv','text/csv');};
  exportBackup=function(){downloadBlob(JSON.stringify({version:8,team,breaks,activeBreaks,repairs,attendance},null,2),'rotation-break-backup.json','application/json');};

  const toolbar=$('#manage .panel:last-child .toolbar');
  if(toolbar&&!$('#attendanceExportBtn')){const b=document.createElement('button');b.id='attendanceExportBtn';b.className='secondary';b.textContent='Export Attendance CSV';b.onclick=exportAttendanceCSV;toolbar.insertBefore(b,toolbar.children[1]||null);}

  const baseRender=render;
  render=function(){baseRender();renderOverview();};
  render();
})();
