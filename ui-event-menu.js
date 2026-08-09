/* Reusable food/beverage menu templates and per-event menus. */
(function(){
  if (typeof UI === "undefined" || typeof Events === "undefined" || typeof Utils === "undefined") return;

  const EventMenu = {
    templateKey: "event_menu_templates",
    templates(){ return Utils.load(this.templateKey, []); },
    saveTemplates(list){ Utils.save(this.templateKey, list); },
    ensureEvent(event){
      if (!event) return null;
      if (!Array.isArray(event.menuItems)) {
        event.menuItems = [];
        Events.update(event.id,{menuItems:event.menuItems});
      }
      return event;
    },
    categories(){
      return [...new Set(["Beverage","Snack","Food","Dessert","Special", ...this.templates().map(x=>String(x.category||"").trim()).filter(Boolean)])].sort();
    },
    addBlank(eventId){
      const event=this.ensureEvent(Events.get(eventId)); if(!event) return;
      event.menuItems.push({id:Utils.id(),name:"",description:"",category:"Beverage",price:0,quantity:0,active:true,includedWithVip:false});
      Events.update(eventId,{menuItems:event.menuItems}); UI.renderEvents();
    },
    addFromTemplate(eventId,templateId){
      const template=this.templates().find(x=>x.id===templateId); if(!template) return;
      const event=this.ensureEvent(Events.get(eventId)); if(!event) return;
      event.menuItems.push({...template,id:Utils.id(),quantity:0,active:true});
      Events.update(eventId,{menuItems:event.menuItems}); UI.renderEvents();
    },
    updateItem(eventId,itemId,key,value){
      const event=this.ensureEvent(Events.get(eventId)); if(!event) return;
      const item=event.menuItems.find(x=>x.id===itemId); if(!item) return;
      item[key]=["price","quantity"].includes(key)?Number(value||0):["active","includedWithVip"].includes(key)?!!value:value;
      Events.update(eventId,{menuItems:event.menuItems});
    },
    removeItem(eventId,itemId){
      const event=this.ensureEvent(Events.get(eventId)); if(!event) return;
      event.menuItems=event.menuItems.filter(x=>x.id!==itemId);
      Events.update(eventId,{menuItems:event.menuItems}); UI.renderEvents();
    },
    saveTemplate(eventId,itemId){
      const event=this.ensureEvent(Events.get(eventId)); if(!event) return;
      const item=event.menuItems.find(x=>x.id===itemId); if(!item || !String(item.name||"").trim()) return alert("Give the menu item a name first.");
      const list=this.templates();
      const existing=list.find(x=>String(x.name||"").trim().toLowerCase()===String(item.name||"").trim().toLowerCase());
      const payload={id:existing?.id||Utils.id(),name:item.name,description:item.description||"",category:item.category||"Beverage",price:Number(item.price||0),includedWithVip:!!item.includedWithVip};
      if(existing) Object.assign(existing,payload); else list.push(payload);
      this.saveTemplates(list); alert("Menu item saved to the reusable menu library."); UI.renderEvents();
    },
    rows(event){
      event=this.ensureEvent(event);
      if(!event.menuItems.length) return `<p>No menu items assigned to this event yet.</p>`;
      const cats=this.categories();
      return event.menuItems.map(item=>`<div style="border:1px solid #ddd;border-radius:10px;padding:12px;margin:10px 0;">
        <label>Item Name</label><input value="${UI.esc(item.name||"")}" onchange="EventMenu.updateItem('${event.id}','${item.id}','name',this.value)">
        <label>Description</label><textarea onchange="EventMenu.updateItem('${event.id}','${item.id}','description',this.value)">${UI.esc(item.description||"")}</textarea>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;">
          <div><label>Category</label><input list="menu-categories-${event.id}" value="${UI.esc(item.category||"")}" onchange="EventMenu.updateItem('${event.id}','${item.id}','category',this.value)"></div>
          <div><label>Price</label><input type="number" min="0" step="0.01" value="${Number(item.price||0)}" onchange="EventMenu.updateItem('${event.id}','${item.id}','price',this.value)"></div>
          <div><label>Quantity Available</label><input type="number" min="0" step="1" value="${Number(item.quantity||0)}" onchange="EventMenu.updateItem('${event.id}','${item.id}','quantity',this.value)"></div>
        </div>
        <datalist id="menu-categories-${event.id}">${cats.map(c=>`<option value="${UI.esc(c)}">`).join("")}</datalist>
        <label><input type="checkbox" ${item.active!==false?"checked":""} onchange="EventMenu.updateItem('${event.id}','${item.id}','active',this.checked)"> Available on this event menu</label>
        <label><input type="checkbox" ${item.includedWithVip?"checked":""} onchange="EventMenu.updateItem('${event.id}','${item.id}','includedWithVip',this.checked)"> Eligible as VIP included snack/beverage</label>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">
          <button type="button" onclick="EventMenu.saveTemplate('${event.id}','${item.id}')">Save to Menu Library</button>
          <button type="button" onclick="EventMenu.removeItem('${event.id}','${item.id}')">Remove from Event</button>
        </div>
      </div>`).join("");
    },
    card(event){
      event=this.ensureEvent(event); const templates=this.templates();
      return `<div class="card"><h3>Event Food & Beverage Menu</h3>
        <p>Build the menu for this event from reusable items. Prices and availability can be changed per event without changing the saved template.</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:end;">
          <button type="button" onclick="EventMenu.addBlank('${event.id}')">+ Add Menu Item</button>
          ${templates.length?`<div><label>Reusable Menu Item</label><select onchange="if(this.value){EventMenu.addFromTemplate('${event.id}',this.value);this.value=''}"><option value="">Choose saved item...</option>${templates.map(t=>`<option value="${UI.esc(t.id)}">${UI.esc(t.name)} — ${Utils.money(Number(t.price||0))}</option>`).join("")}</select></div>`:""}
        </div>
        ${this.rows(event)}
      </div>`;
    }
  };
  window.EventMenu=EventMenu;

  const priorEvents=UI.renderEvents;
  UI.renderEvents=function(...args){
    const result=priorEvents.apply(this,args);
    const workspace=document.getElementById("workspace"); if(!workspace) return result;
    Events.all().forEach(event=>{
      const cards=[...workspace.querySelectorAll(".card")];
      const card=cards.find(c=>c.querySelector(`input[onchange*="Events.update('${event.id}'"]`));
      if(card && !document.getElementById(`event-menu-${event.id}`)){
        const wrap=document.createElement("div"); wrap.id=`event-menu-${event.id}`; wrap.innerHTML=EventMenu.card(event); card.insertAdjacentElement("afterend",wrap);
      }
    });
    return result;
  };
})();
