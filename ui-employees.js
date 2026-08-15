/* Reusable employee/staff directory + event assignment controls. */
(function(){
  if(typeof UI==='undefined'||typeof SNPDatabase==='undefined'||typeof Events==='undefined') return;
  const EmployeeDirectory={
    employees:[],
    async request(options={}){
      const s=await SNPDatabase.getSession();
      if(!s?.access_token) throw new Error('Sign in again first.');
      const r=await fetch(`${SNP_SUPABASE_URL}/functions/v1/employee-directory-api`,{
        ...options,
        headers:{...SNPDatabase.headers(s.access_token),...(options.headers||{})}
      });
      const d=await r.json().catch(()=>({}));
      if(!r.ok||d.ok===false) throw new Error(d.error||'Employee directory request failed.');
      return d;
    },
    async refresh(rerender=false){
      try{const d=await this.request();this.employees=d.employees||[];if(rerender)UI.renderEmployees();return this.employees;}catch(e){console.error(e);return this.employees;}
    },
    async saveManual(){
      try{
        const fullName=document.getElementById('employeeName')?.value.trim()||'',email=document.getElementById('employeeEmail')?.value.trim()||'',phone=document.getElementById('employeePhone')?.value.trim()||'',defaultRole=document.getElementById('employeeRole')?.value.trim()||'Event Staff',notes=document.getElementById('employeeNotes')?.value.trim()||'';
        if(!email)return alert('Enter the employee email.');
        await this.request({method:'POST',body:JSON.stringify({action:'upsert_employee',fullName,email,phone,defaultRole,notes})});
        await this.refresh(true);alert('Employee saved. You can now send their Staff Portal invitation by email.');
      }catch(e){alert(e.message)}
    },
    async sendInvite(employeeId){
      try{
        const emp=this.employees.find(x=>String(x.id)===String(employeeId));if(!emp)return alert('Employee not found.');
        if(!emp.email)return alert('Add an email address before sending a Staff Portal invite.');
        const d=await this.request({method:'POST',body:JSON.stringify({action:'send_invite',employeeId})});
        await this.refresh(true);
        alert(d.message||'Staff invitation sent.');
      }catch(e){alert('Unable to send staff invitation: '+e.message)}
    },
    async createInvite(){
      try{
        const email=document.getElementById('inviteEmployeeEmail')?.value.trim()||'',defaultRole=document.getElementById('inviteEmployeeRole')?.value.trim()||'Event Staff';
        const d=await this.request({method:'POST',body:JSON.stringify({action:'create_invite',email,defaultRole})});
        const out=document.getElementById('employeeInviteResult');if(out)out.innerHTML=`<p><strong>Backup signup link</strong></p><input readonly value="${UI.esc(d.inviteUrl)}" onclick="this.select()"><p><small>Expires ${UI.esc(new Date(d.expiresAt).toLocaleString())}. Use this only if you want to send the link manually.</small></p>`;
      }catch(e){alert(e.message)}
    },
    async copyInvite(employeeId){
      try{
        const emp=this.employees.find(x=>String(x.id)===String(employeeId));if(!emp?.email)return alert('Employee email is required.');
        const d=await this.request({method:'POST',body:JSON.stringify({action:'create_invite',email:emp.email,defaultRole:emp.default_role||'Event Staff'})});
        await navigator.clipboard.writeText(d.inviteUrl);alert('Backup staff signup link copied.');
      }catch(e){alert(e.message)}
    },
    async addToEvent(eventId,employeeId){
      try{
        if(!this.employees.length)await this.refresh();const emp=this.employees.find(x=>String(x.id)===String(employeeId));if(!emp)return alert('Choose an employee from the directory.');
        const event=Events.get(eventId);if(!event)return;event.staffAssignments=Array.isArray(event.staffAssignments)?event.staffAssignments:[];
        const existing=event.staffAssignments.find(x=>String(x.employeeProfileId||'')===String(emp.id)||String(x.staffEmail||'').toLowerCase()===String(emp.email||'').toLowerCase());if(existing)return alert('This employee is already assigned to this event.');
        const row={id:Utils.id(),employeeProfileId:emp.id,name:emp.full_name||'',role:emp.default_role||'Event Staff',staffEmail:emp.email||'',phone:emp.phone||'',payType:'hourly',payRate:0,scheduledHours:0,salesTotal:0,clockIn:'',clockOut:'',accessRole:'sales_only',canCheckIn:true,canScanQr:true,canAcceptPayments:true,canEventSales:true,canViewGuestList:true,canRedeemItems:true,staffAccessActive:true};
        event.staffAssignments.push(row);Events.update(eventId,{staffAssignments:event.staffAssignments});UI.renderEvents();setTimeout(()=>{if(window.StaffAccessAdmin)StaffAccessAdmin.save(eventId,row.id);},100);
      }catch(e){alert(e.message)}
    },
    async loadForEvent(eventId){await this.refresh();UI.renderEvents();setTimeout(()=>{const el=document.getElementById(`employee-dir-${eventId}`);if(el)el.focus();},50);},
    options(){return this.employees.filter(x=>x.active!==false).map(x=>`<option value="${UI.esc(x.id)}">${UI.esc(x.full_name||x.email)} — ${UI.esc(x.default_role||'Event Staff')}</option>`).join('');},
    status(x){const s=String(x.invite_status||'not_sent');if(s==='connected'||x.invite_accepted_at)return 'Portal Connected';if(s==='sent')return 'Invite Sent';return x.staff_user_id?'Portal Account Found':'Invite Not Sent';}
  };
  window.EmployeeDirectory=EmployeeDirectory;

  UI.renderEmployees=function(){
    const rows=EmployeeDirectory.employees;
    document.getElementById('workspace').innerHTML=`
      <h2>Employees / Event Staff</h2>
      <div class="card"><h3>Add Employee or Staff Member</h3><p>Create the employee record here. You do not create their password. After saving, use <strong>Send Staff Invite</strong> and the employee creates their own secure login.</p><label>Name</label><input id="employeeName"><label>Email</label><input id="employeeEmail" type="email"><label>Phone</label><input id="employeePhone" type="tel"><label>Default Role</label><input id="employeeRole" value="Event Staff"><label>Notes</label><textarea id="employeeNotes"></textarea><button type="button" onclick="EmployeeDirectory.saveManual()">Save Employee</button></div>
      <div class="card"><h3>Manual / Backup Signup Link</h3><p>The normal method is the automatic email button on the employee record below. This section creates a copyable link only when you want to send it yourself.</p><label>Employee Email</label><input id="inviteEmployeeEmail" type="email" placeholder="employee@example.com"><label>Default Role</label><input id="inviteEmployeeRole" value="Event Staff"><button type="button" onclick="EmployeeDirectory.createInvite()">Create Backup Signup Link</button><div id="employeeInviteResult"></div></div>
      <div class="card"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center;flex-wrap:wrap"><h3>Employee / Staff List</h3><button onclick="EmployeeDirectory.refresh(true)">Refresh</button></div>
        ${rows.length?rows.map(x=>`<div style="border:1px solid #ddd;border-radius:10px;padding:12px;margin:10px 0"><strong>${UI.esc(x.full_name||'Unnamed Staff Member')}</strong><p>${UI.esc(x.default_role||'Event Staff')}<br>${UI.esc(x.email||'')}${x.phone?'<br>'+UI.esc(x.phone):''}</p><p><strong>Status:</strong> ${UI.esc(EmployeeDirectory.status(x))}${x.invite_sent_at?`<br><small>Last invite: ${UI.esc(new Date(x.invite_sent_at).toLocaleString())}</small>`:''}</p><div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" onclick="EmployeeDirectory.sendInvite('${x.id}')">${String(x.invite_status||'')==='sent'?'Resend Staff Invite':'Send Staff Invite'}</button><button type="button" onclick="EmployeeDirectory.copyInvite('${x.id}')">Copy Backup Link</button></div></div>`).join(''):'<p>No employees saved yet.</p>'}
      </div>`;
  };

  const oldSidebar=UI.renderSidebar.bind(UI);UI.renderSidebar=function(){oldSidebar();const s=document.getElementById('sidebar');if(s&&!document.getElementById('employeesMainMenuBtn')){const b=document.createElement('button');b.id='employeesMainMenuBtn';b.textContent='Employees / Event Staff';b.onclick=async()=>{UI.renderEmployees();await EmployeeDirectory.refresh(true)};const eventsBtn=[...s.querySelectorAll('button')].find(x=>x.textContent.trim()==='Events');if(eventsBtn)eventsBtn.insertAdjacentElement('afterend',b);else s.appendChild(b);}};
  if(typeof TicketPlanning!=='undefined'){const oldRows=TicketPlanning.staffRows.bind(TicketPlanning);TicketPlanning.staffRows=function(event){const chooser=`<div class="card" style="border:1px solid #ddd;margin-bottom:12px"><h4>Add Employee / Staff to This Event</h4><p>Select a saved employee, or load the employee directory first.</p><div style="display:flex;gap:8px;flex-wrap:wrap"><select id="employee-dir-${event.id}" style="min-width:240px"><option value="">Select saved employee</option>${EmployeeDirectory.options()}</select><button type="button" onclick="EmployeeDirectory.addToEvent('${event.id}',document.getElementById('employee-dir-${event.id}').value)">+ Add Employee to Event</button><button type="button" onclick="EmployeeDirectory.loadForEvent('${event.id}')">Refresh Employee List</button><button type="button" onclick="UI.renderEmployees();EmployeeDirectory.refresh(true)">+ New Employee / Staff Member</button></div></div>`;return chooser+oldRows(event);};}
})();
