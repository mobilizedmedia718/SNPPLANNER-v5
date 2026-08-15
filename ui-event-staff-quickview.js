/* Event-page quick staff view and assignment controls. */
(function(){
  if(typeof UI==='undefined'||typeof Events==='undefined') return;

  const EventStaffQuickView={
    esc(v){return UI.esc(v??'');},
    staff(event){return Array.isArray(event?.staffAssignments)?event.staffAssignments:[];},
    count(event){
      const staff=this.staff(event).length;
      const instructor=String(event?.instructor||'').trim()?1:0;
      return staff+instructor;
    },
    summaryHtml(event){
      const rows=this.staff(event);
      const instructor=String(event?.instructor||'').trim();
      const people=[];
      if(instructor) people.push(`<div style="border:1px solid #ddd;border-radius:8px;padding:10px;margin:7px 0"><strong>${this.esc(instructor)}</strong><br><small>Instructor</small></div>`);
      rows.forEach(s=>{
        const pay=s.payType==='volunteer'?'Volunteer':s.payType==='flat'?`Flat rate${Number(s.payRate||0)?' — '+Utils.money(Number(s.payRate||0)):''}`:s.payType==='commission'?`Commission${Number(s.payRate||0)?' — '+Number(s.payRate||0)+'%':''}`:s.payType==='hourly_commission'?`Hourly + Commission${Number(s.payRate||0)?' — '+Utils.money(Number(s.payRate||0)):''}`:`Hourly${Number(s.payRate||0)?' — '+Utils.money(Number(s.payRate||0))+'/hr':''}`;
        people.push(`<div style="border:1px solid #ddd;border-radius:8px;padding:10px;margin:7px 0"><strong>${this.esc(s.name||'Unnamed Staff Member')}</strong><br><span>${this.esc(s.role||'Event Staff')}</span>${s.staffEmail?`<br><small>${this.esc(s.staffEmail)}</small>`:''}${s.phone?`<br><small>${this.esc(s.phone)}</small>`:''}<br><small>${this.esc(pay)}${Number(s.scheduledHours||0)?' • '+Number(s.scheduledHours||0)+' scheduled hrs':''}</small></div>`);
      });
      return people.length?people.join(''):'<p>No instructor or staff is currently assigned to this event.</p>';
    },
    toggle(eventId){
      const box=document.getElementById(`event-staff-view-${eventId}`);if(!box)return;
      box.hidden=!box.hidden;
    },
    async toggleAdd(eventId){
      const box=document.getElementById(`event-staff-add-${eventId}`);if(!box)return;
      box.hidden=!box.hidden;
      if(!box.hidden&&window.EmployeeDirectory){
        await EmployeeDirectory.refresh();
        const sel=document.getElementById(`event-staff-select-${eventId}`);
        if(sel) sel.innerHTML='<option value="">Select saved employee</option>'+EmployeeDirectory.options();
      }
    },
    async add(eventId){
      if(!window.EmployeeDirectory)return alert('Employee directory is not available.');
      const sel=document.getElementById(`event-staff-select-${eventId}`);
      if(!sel?.value)return alert('Choose an employee or staff member first.');
      await EmployeeDirectory.addToEvent(eventId,sel.value);
    },
    decorate(){
      const workspace=document.getElementById('workspace');if(!workspace)return;
      const events=Events.all();
      const cards=[...workspace.querySelectorAll(':scope > .card')];
      events.forEach((event,i)=>{
        const card=cards[i];if(!card||card.querySelector(`[data-event-staff-quick="${event.id}"]`))return;
        const wrap=document.createElement('div');
        wrap.dataset.eventStaffQuick=event.id;
        wrap.style.cssText='border:1px solid #ddd;border-radius:10px;padding:10px;margin:0 0 14px 0;background:#fafafa';
        wrap.innerHTML=`<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><strong>Event Staff: ${this.count(event)}</strong><button type="button" onclick="EventStaffQuickView.toggle('${event.id}')">View Staff / Employees</button><button type="button" onclick="EventStaffQuickView.toggleAdd('${event.id}')">+ Add Staff to Event</button></div><div id="event-staff-view-${event.id}" hidden style="margin-top:10px"><h4 style="margin:0 0 8px">Assigned People</h4>${this.summaryHtml(event)}</div><div id="event-staff-add-${event.id}" hidden style="margin-top:10px"><select id="event-staff-select-${event.id}" style="min-width:250px"><option value="">Select saved employee</option>${window.EmployeeDirectory?EmployeeDirectory.options():''}</select> <button type="button" onclick="EventStaffQuickView.add('${event.id}')">Add Selected Employee</button> <button type="button" onclick="UI.renderEmployees();EmployeeDirectory.refresh(true)">+ New Employee / Staff Member</button></div>`;
        card.insertBefore(wrap,card.firstChild);
      });
    }
  };
  window.EventStaffQuickView=EventStaffQuickView;

  const oldRenderEvents=UI.renderEvents.bind(UI);
  UI.renderEvents=function(){
    const result=oldRenderEvents();
    setTimeout(()=>EventStaffQuickView.decorate(),0);
    return result;
  };
})();
