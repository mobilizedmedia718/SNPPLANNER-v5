/* Ticket consumables: non-reusable inventory automatically consumed by ticket sales. */
(function(){
  if (typeof Inventory === 'undefined' || typeof Events === 'undefined' || typeof UI === 'undefined') return;

  const CATEGORY = 'Ticket Consumables';
  const originalCategories = Inventory.categories.bind(Inventory);
  Inventory.categories = function(){
    return [...new Set([CATEGORY, ...originalCategories()])].sort();
  };

  const TicketConsumables = {
    category: CATEGORY,
    consumables(){
      return Inventory.all().filter(i => i.status !== 'Inactive' && String(i.category || '').trim().toLowerCase() === CATEGORY.toLowerCase());
    },
    event(eventId){ return Events.get(eventId); },
    ticket(eventId,ticketId){ return (this.event(eventId)?.ticketTypes || []).find(t => String(t.id) === String(ticketId)); },
    ensure(ticket){
      if (!ticket) return [];
      if (!Array.isArray(ticket.inventoryRequirements)) ticket.inventoryRequirements = [];
      return ticket.inventoryRequirements;
    },
    save(eventId){
      const event=this.event(eventId); if(!event) return;
      Events.update(eventId,{ticketTypes:event.ticketTypes});
    },
    add(eventId,ticketId){
      const t=this.ticket(eventId,ticketId); if(!t) return;
      const items=this.consumables();
      if(!items.length) return alert('Add an inventory item in the Ticket Consumables category first.');
      const reqs=this.ensure(t);
      const available=items.find(i=>!reqs.some(r=>String(r.inventoryId)===String(i.id)));
      if(!available) return alert('All Ticket Consumables are already linked to this ticket type.');
      reqs.push({id:Utils.id(),inventoryId:available.id,quantity:1});
      this.save(eventId); UI.renderEvents();
    },
    update(eventId,ticketId,reqId,key,value){
      const t=this.ticket(eventId,ticketId); if(!t) return;
      const req=this.ensure(t).find(r=>String(r.id)===String(reqId)); if(!req) return;
      req[key]=key==='quantity'?Math.max(0,Number(value||0)):value;
      this.save(eventId);
    },
    remove(eventId,ticketId,reqId){
      const t=this.ticket(eventId,ticketId); if(!t) return;
      t.inventoryRequirements=this.ensure(t).filter(r=>String(r.id)!==String(reqId));
      this.save(eventId); UI.renderEvents();
    },
    setEventbriteClass(eventId,ticketId,value){
      const t=this.ticket(eventId,ticketId); if(!t) return;
      t.eventbriteTicketClassId=String(value||'');
      this.save(eventId);
    },
    ticketBlock(event,t){
      const reqs=this.ensure(t), items=this.consumables();
      const link=(typeof Eventbrite!=='undefined')?Eventbrite.link(event.id):null;
      const classes=Array.isArray(link?.ticketClasses)?link.ticketClasses:[];
      return `<div style="border:1px solid #ddd;border-radius:10px;padding:12px;margin:10px 0;">
        <h4>${UI.esc(t.name||'Unnamed Ticket')}</h4>
        <p><small>Each paid ticket deducts the quantities below from inventory. Reusable supplies should not be linked here.</small></p>
        ${classes.length?`<label>Matching Eventbrite Ticket Class</label><select onchange="TicketConsumables.setEventbriteClass('${event.id}','${t.id}',this.value)"><option value="">Not mapped</option>${classes.map(c=>`<option value="${UI.esc(c.id)}" ${String(t.eventbriteTicketClassId||'')===String(c.id)?'selected':''}>${UI.esc(c.name||'Ticket Class')}</option>`).join('')}</select>`:''}
        ${reqs.length?reqs.map(r=>{const item=Inventory.get(r.inventoryId);return `<div style="display:grid;grid-template-columns:minmax(160px,1fr) 110px auto;gap:8px;align-items:end;margin:8px 0;"><div><label>Inventory Item</label><select onchange="TicketConsumables.update('${event.id}','${t.id}','${r.id}','inventoryId',this.value)">${items.map(i=>`<option value="${i.id}" ${String(i.id)===String(r.inventoryId)?'selected':''}>${UI.esc(i.name||'Item')} — stock ${Number(i.quantity||0)}</option>`).join('')}</select></div><div><label>Per Ticket</label><input type="number" min="0" step="0.01" value="${Number(r.quantity||1)}" onchange="TicketConsumables.update('${event.id}','${t.id}','${r.id}','quantity',this.value)"></div><button type="button" onclick="TicketConsumables.remove('${event.id}','${t.id}','${r.id}')">Remove</button></div>`}).join(''):`<p>No consumables linked yet.</p>`}
        <button type="button" onclick="TicketConsumables.add('${event.id}','${t.id}')">+ Add Ticket Consumable</button>
      </div>`;
    },
    card(event){
      const tickets=Array.isArray(event.ticketTypes)?event.ticketTypes:[];
      return `<div class="card" id="ticket-consumables-${UI.esc(event.id)}"><h3>Ticket Consumables & Automatic Inventory</h3><p>Use inventory category <strong>${CATEGORY}</strong> for one-time-use items such as canvases, paint portions, disposable materials, and take-home supplies. Items linked below are deducted only when a ticket is paid.</p>${tickets.length?tickets.map(t=>this.ticketBlock(event,t)).join(''):'<p>Add a ticket type first.</p>'}</div>`;
    }
  };
  window.TicketConsumables=TicketConsumables;

  if (typeof TicketPlanning !== 'undefined' && typeof TicketPlanning.planningCard === 'function') {
    const originalPlanningCard=TicketPlanning.planningCard.bind(TicketPlanning);
    TicketPlanning.planningCard=function(event){ return originalPlanningCard(event)+TicketConsumables.card(event); };
  }

  if (typeof UI.renderInventoryEdit === 'function') {
    const originalInventoryEdit=UI.renderInventoryEdit;
    UI.renderInventoryEdit=function(id){
      const result=originalInventoryEdit.call(UI,id);
      const category=document.getElementById('inventoryCategory');
      if(category){
        const note=document.createElement('p');
        note.innerHTML='<small><strong>Ticket Consumables</strong> = non-reusable items that can be automatically deducted when linked to a paid ticket type.</small>';
        category.insertAdjacentElement('afterend',note);
      }
      return result;
    };
  }

  if (typeof Eventbrite !== 'undefined' && typeof Eventbrite.syncSales === 'function') {
    const originalSyncSales=Eventbrite.syncSales.bind(Eventbrite);
    Eventbrite.syncSales=async function(eventId){
      const link=Eventbrite.link(eventId);
      const before={};
      (link.sales||[]).forEach(r=>before[String(r.ticketClassId||'')]=Number(r.quantity||0));
      const result=await originalSyncSales(eventId);
      const event=Events.get(eventId); if(!event) return result;
      const applied=link.inventoryAppliedByClass && typeof link.inventoryAppliedByClass==='object'?link.inventoryAppliedByClass:{};
      let changed=false;
      for(const row of (link.sales||[])){
        const classId=String(row.ticketClassId||'');
        const soldNow=Number(row.quantity||0);
        const already=Number(applied[classId]||0);
        const delta=Math.max(0,soldNow-already);
        if(delta<=0) continue;
        const ticket=(event.ticketTypes||[]).find(t=>String(t.eventbriteTicketClassId||'')===classId);
        if(!ticket) continue;
        for(const req of (Array.isArray(ticket.inventoryRequirements)?ticket.inventoryRequirements:[])){
          const item=Inventory.get(req.inventoryId); if(!item) continue;
          const qty=delta*Math.max(0,Number(req.quantity||0));
          item.quantity=Math.max(0,Number(item.quantity||0)-qty);
          item.ticketConsumedQuantity=Number(item.ticketConsumedQuantity||0)+qty;
          changed=true;
        }
        applied[classId]=soldNow;
      }
      if(changed) Inventory.save();
      link.inventoryAppliedByClass=applied; Eventbrite.save();
      return result;
    };
  }
})();
