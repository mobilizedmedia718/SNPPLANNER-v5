/* Ticket inclusions: reusable add-ons/benefits tied to each event ticket type. */
(function(){
  if(typeof UI==='undefined'||typeof Events==='undefined'||typeof Utils==='undefined') return;
  const TicketInclusions={
    ensure(ticket){ if(!Array.isArray(ticket.inclusions)) ticket.inclusions=[]; return ticket.inclusions; },
    add(eventId,ticketId){
      const e=Events.get(eventId); if(!e) return; const t=(e.ticketTypes||[]).find(x=>x.id===ticketId); if(!t) return;
      this.ensure(t).push({id:Utils.id(),label:'Included Item',quantity:1,menuCategory:'',choiceFromEventMenu:true,notes:''});
      Events.update(eventId,{ticketTypes:e.ticketTypes}); UI.renderEvents();
    },
    update(eventId,ticketId,inclusionId,key,value){
      const e=Events.get(eventId); if(!e) return; const t=(e.ticketTypes||[]).find(x=>x.id===ticketId); if(!t) return;
      const i=this.ensure(t).find(x=>x.id===inclusionId); if(!i) return;
      i[key]=key==='quantity'?Math.max(1,Number(value||1)):key==='choiceFromEventMenu'?!!value:value;
      Events.update(eventId,{ticketTypes:e.ticketTypes});
    },
    remove(eventId,ticketId,inclusionId){
      const e=Events.get(eventId); if(!e) return; const t=(e.ticketTypes||[]).find(x=>x.id===ticketId); if(!t) return;
      t.inclusions=this.ensure(t).filter(x=>x.id!==inclusionId); Events.update(eventId,{ticketTypes:e.ticketTypes}); UI.renderEvents();
    },
    rows(e,t){
      const list=this.ensure(t);
      return `${list.length?list.map(i=>`<div style="border:1px solid #ddd;border-radius:8px;padding:10px;margin:8px 0;display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;align-items:end;">
        <div><label>Included Feature</label><input value="${UI.esc(i.label||'')}" onchange="TicketInclusions.update('${e.id}','${t.id}','${i.id}','label',this.value)"></div>
        <div><label>Quantity</label><input type="number" min="1" step="1" value="${Number(i.quantity||1)}" onchange="TicketInclusions.update('${e.id}','${t.id}','${i.id}','quantity',this.value)"></div>
        <div><label>Menu Category / Choice Group</label><input value="${UI.esc(i.menuCategory||'')}" placeholder="Entree, Bottle, Beverage..." onchange="TicketInclusions.update('${e.id}','${t.id}','${i.id}','menuCategory',this.value)"></div>
        <div><label>Notes</label><input value="${UI.esc(i.notes||'')}" onchange="TicketInclusions.update('${e.id}','${t.id}','${i.id}','notes',this.value)"></div>
        <label><input type="checkbox" ${i.choiceFromEventMenu!==false?'checked':''} onchange="TicketInclusions.update('${e.id}','${t.id}','${i.id}','choiceFromEventMenu',this.checked)"> Customer chooses from eligible event-menu items</label>
        <button type="button" onclick="TicketInclusions.remove('${e.id}','${t.id}','${i.id}')">Remove Feature</button>
      </div>`).join(''):'<p><small>No included extras. This ticket is admission-only unless its description says otherwise.</small></p>'}
      <button type="button" onclick="TicketInclusions.add('${e.id}','${t.id}')">+ Add Included Feature</button>`;
    },
    card(e){
      const tickets=(e.ticketTypes||[]).filter(t=>t.active!==false);
      return `<div class="card"><h3>Ticket Included Features & Add-ons</h3><p>Define what comes with each ticket. Menu-based benefits can be changed event-by-event without rewriting the ticket.</p>${tickets.map(t=>`<div style="border:1px solid #bbb;border-radius:10px;padding:12px;margin:10px 0;"><h4>${UI.esc(t.name||'Ticket')} — ${Utils.money(Number(t.price||0))}</h4>${this.rows(e,t)}</div>`).join('')||'<p>Add ticket types first.</p>'}</div>`;
    }
  };
  window.TicketInclusions=TicketInclusions;
  const prior=UI.renderEvents;
  UI.renderEvents=function(...args){
    const result=prior.apply(this,args); const ws=document.getElementById('workspace'); if(!ws) return result;
    Events.all().forEach(e=>{
      const planning=document.getElementById(`ticket-planning-${e.id}`); if(planning&&!document.getElementById(`ticket-inclusions-${e.id}`)){
        const wrap=document.createElement('div'); wrap.id=`ticket-inclusions-${e.id}`; wrap.innerHTML=TicketInclusions.card(e); planning.insertAdjacentElement('afterend',wrap);
      }
    });
    return result;
  };
})();