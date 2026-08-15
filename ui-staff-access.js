/* Owner-managed event staff login/access controls. */
(function(){
  if(typeof UI==='undefined'||typeof Events==='undefined'||typeof SNPDatabase==='undefined') return;
  const StaffAccessAdmin={
    async save(eventId,staffId){
      const e=Events.get(eventId); if(!e)return;
      const s=(e.staffAssignments||[]).find(x=>x.id===staffId); if(!s)return;
      const email=String(s.staffEmail||'').trim().toLowerCase();
      if(!email)return alert('Enter the staff member email first.');
      const session=await SNPDatabase.getSession(); if(!session?.access_token)return alert('Sign in again first.');
      const payload={owner_user_id:session.user.id,event_id:eventId,email,display_name:s.name||'',active:s.staffAccessActive!==false,can_check_in:s.canCheckIn!==false,can_scan_qr:s.canScanQr!==false,can_accept_payments:s.canAcceptPayments!==false,can_event_sales:s.canEventSales!==false,can_view_guest_list:s.canViewGuestList!==false,can_redeem_items:s.canRedeemItems!==false,updated_at:new Date().toISOString()};
      const r=await fetch(`${SNP_SUPABASE_URL}/rest/v1/event_staff_access?on_conflict=owner_user_id,event_id,email`,{method:'POST',headers:{...SNPDatabase.headers(session.access_token),Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(payload)});
      if(!r.ok)return alert('Unable to save staff access: '+await r.text());
      s.staffAccessSavedAt=new Date().toISOString(); Events.update(eventId,{staffAssignments:e.staffAssignments});
      alert(`Event staff access saved.\n\nStaff account: ${email}\n\nThis employee can sign in to the Staff Portal using their verified staff account. No separate staff code is required.`);
    },
    async disable(eventId,staffId){
      const e=Events.get(eventId);const s=(e?.staffAssignments||[]).find(x=>x.id===staffId);if(!s?.staffEmail)return;
      s.staffAccessActive=false;Events.update(eventId,{staffAssignments:e.staffAssignments});await this.save(eventId,staffId);
    },
    portalUrl(){return 'https://mobilizedmedia718.github.io/SNPPLANNER-v5/staff.html';}
  };
  window.StaffAccessAdmin=StaffAccessAdmin;
  if(typeof TicketPlanning!=='undefined'){
    const old=TicketPlanning.staffRows.bind(TicketPlanning);
    TicketPlanning.staffRows=function(event){
      const base=old(event); const rows=event.staffAssignments||[];
      if(!rows.length)return base;
      return base+`<div class="card"><h4>Staff Login & Event Permissions</h4><p>Staff use a separate event-only portal. They do not receive access to company finances, vendors, inventory setup, reports, business profile, or post-event administration.</p><p><strong>Login:</strong> Staff sign in with their verified Staff Portal email and password. No separate staff code is used.</p><p><strong>Staff Portal:</strong> <input readonly value="${UI.esc(StaffAccessAdmin.portalUrl())}" onclick="this.select()"></p>${rows.map(s=>`<div style="border:1px solid #ddd;border-radius:10px;padding:12px;margin:10px 0"><strong>${UI.esc(s.name||'Staff Member')}</strong><label>Verified Staff Account Email</label><input type="email" value="${UI.esc(s.staffEmail||'')}" onchange="TicketPlanning.updateStaff('${event.id}','${s.id}','staffEmail',this.value)">${s.staffEmail?`<p><small>Event access will be assigned to: <strong>${UI.esc(s.staffEmail)}</strong></small></p>`:''}<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;margin-top:8px"><label><input type="checkbox" ${s.canCheckIn!==false?'checked':''} onchange="TicketPlanning.updateStaff('${event.id}','${s.id}','canCheckIn',this.checked)"> Check people in</label><label><input type="checkbox" ${s.canScanQr!==false?'checked':''} onchange="TicketPlanning.updateStaff('${event.id}','${s.id}','canScanQr',this.checked)"> Scan QR codes</label><label><input type="checkbox" ${s.canAcceptPayments!==false?'checked':''} onchange="TicketPlanning.updateStaff('${event.id}','${s.id}','canAcceptPayments',this.checked)"> Accept payments</label><label><input type="checkbox" ${s.canEventSales!==false?'checked':''} onchange="TicketPlanning.updateStaff('${event.id}','${s.id}','canEventSales',this.checked)"> Event sales</label><label><input type="checkbox" ${s.canViewGuestList!==false?'checked':''} onchange="TicketPlanning.updateStaff('${event.id}','${s.id}','canViewGuestList',this.checked)"> View guest list</label><label><input type="checkbox" ${s.canRedeemItems!==false?'checked':''} onchange="TicketPlanning.updateStaff('${event.id}','${s.id}','canRedeemItems',this.checked)"> Redeem prepaid items</label></div><label><input type="checkbox" ${s.staffAccessActive!==false?'checked':''} onchange="TicketPlanning.updateStaff('${event.id}','${s.id}','staffAccessActive',this.checked)"> Staff login active</label><br><button type="button" onclick="StaffAccessAdmin.save('${event.id}','${s.id}')">Save Staff Access</button> <button type="button" onclick="StaffAccessAdmin.disable('${event.id}','${s.id}')">Disable Access</button></div>`).join('')}</div>`;
    };
  }
})();