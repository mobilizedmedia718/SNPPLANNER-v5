/* Reusable food/beverage menu templates and per-event menus. */
(function(){
  if (typeof UI === "undefined" || typeof Events === "undefined" || typeof Utils === "undefined") return;

  const WINE_NAMES = [
    "Barefoot Cabernet Sauvignon",
    "Barefoot Moscato",
    "Josh Cellars Cabernet Sauvignon",
    "Josh Cellars Chardonnay",
    "Sutter Home White Zinfandel",
    "Sutter Home Moscato",
    "Kendall-Jackson Vintner's Reserve Chardonnay",
    "La Marca Prosecco",
    "Stella Rosa Black",
    "Stella Rosa Rosso",
    "Woodbridge Cabernet Sauvignon",
    "Woodbridge Chardonnay"
  ];

  const EventMenu = {
    templateKey: "event_menu_templates",
    templates(){ return Utils.load(this.templateKey, []); },
    saveTemplates(list){ Utils.save(this.templateKey, list); },

    systemPresets(){
      const bottles=WINE_NAMES.map((name,i)=>({id:`preset-bottle-${i}`,name,description:"Bottle selection. Availability may vary by event.",category:"Bottles",price:20,preset:true,alcohol:true}));
      const glasses=WINE_NAMES.map((name,i)=>({id:`preset-glass-${i}`,name,description:"Wine by the glass. Availability may vary by event.",category:"Glasses",price:9,preset:true,alcohol:true}));
      return [
        ...bottles,
        ...glasses,
        {id:"preset-entree",name:"Featured Entree",description:"Describe the featured entree for this event.",category:"Entree",price:25,preset:true},
        {id:"preset-food",name:"Food Item",description:"Describe this food item.",category:"Food",price:0,preset:true},
        {id:"preset-snack",name:"Snack",description:"Describe this snack.",category:"Snack",price:0,preset:true},
        {id:"preset-dessert",name:"Dessert",description:"Describe this dessert.",category:"Dessert",price:0,preset:true},
        {id:"preset-nonalcoholic",name:"Non-Alcoholic Beverage",description:"Describe this beverage.",category:"Non-Alcoholic",price:0,preset:true}
      ];
    },

    library(){
      const saved=this.templates();
      const byKey=new Map();
      [...this.systemPresets(),...saved].forEach(item=>{
        const key=`${String(item.category||"").trim().toLowerCase()}|${String(item.name||"").trim().toLowerCase()}`;
        byKey.set(key,item);
      });
      return [...byKey.values()];
    },

    ensureEvent(event){
      if (!event) return null;
      if (!Array.isArray(event.menuItems)) {
        event.menuItems = [];
        Events.update(event.id,{menuItems:event.menuItems});
      }
      return event;
    },

    categories(){
      return [...new Set(["Bottles","Glasses","Entree","Food","Snack","Dessert","Non-Alcoholic","Beverage","Special", ...this.library().map(x=>String(x.category||"").trim()).filter(Boolean)])].sort();
    },

    publicUrl(eventId){
      return `https://mobilizedmedia718.github.io/SNPPLANNER-v5/preorder.html?event_id=${encodeURIComponent(eventId)}`;
    },

    addBlank(eventId,category="Food"){
      const event=this.ensureEvent(Events.get(eventId)); if(!event) return;
      const defaultPrice=category==="Entree"?25:category==="Bottles"?20:category==="Glasses"?9:0;
      event.menuItems.push({id:Utils.id(),name:"",description:"",category,price:defaultPrice,quantity:0,active:true,includedWithVip:false});
      Events.update(eventId,{menuItems:event.menuItems}); UI.renderEvents();
    },

    addFromTemplate(eventId,templateId){
      const template=this.library().find(x=>x.id===templateId); if(!template) return;
      const event=this.ensureEvent(Events.get(eventId)); if(!event) return;
      event.menuItems.push({...template,id:Utils.id(),quantity:0,active:true,preset:false});
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
      const existing=list.find(x=>String(x.name||"").trim().toLowerCase()===String(item.name||"").trim().toLowerCase() && String(x.category||"").trim().toLowerCase()===String(item.category||"").trim().toLowerCase());
      const payload={id:existing?.id||Utils.id(),name:item.name,description:item.description||"",category:item.category||"Food",price:Number(item.price||0),includedWithVip:!!item.includedWithVip};
      if(existing) Object.assign(existing,payload); else list.push(payload);
      this.saveTemplates(list); alert("Menu item saved to the reusable menu library."); UI.renderEvents();
    },

    rows(event){
      event=this.ensureEvent(event);
      if(!event.menuItems.length) return `<p>No menu items assigned to this event yet. Choose only the wines and foods you want for this event from the library above.</p>`;
      const cats=this.categories();
      return event.menuItems.map(item=>`<div style="border:1px solid #ddd;border-radius:10px;padding:12px;margin:10px 0;">
        <label>Item Name</label><input placeholder="Menu item name" value="${UI.esc(item.name||"")}" oninput="EventMenu.updateItem('${event.id}','${item.id}','name',this.value)">
        <label>Description</label><textarea placeholder="Describe exactly what the guest receives" oninput="EventMenu.updateItem('${event.id}','${item.id}','description',this.value)">${UI.esc(item.description||"")}</textarea>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;">
          <div><label>Category</label><input list="menu-categories-${event.id}" placeholder="Food, Entree, Bottles..." value="${UI.esc(item.category||"")}" oninput="EventMenu.updateItem('${event.id}','${item.id}','category',this.value)"></div>
          <div><label>Price</label><input type="number" min="0" step="0.01" placeholder="0.00" value="${Number(item.price||0)}" oninput="EventMenu.updateItem('${event.id}','${item.id}','price',this.value)"></div>
          <div><label>Quantity Available</label><input type="number" min="0" step="1" placeholder="0" value="${Number(item.quantity||0)}" oninput="EventMenu.updateItem('${event.id}','${item.id}','quantity',this.value)"></div>
        </div>
        <datalist id="menu-categories-${event.id}">${cats.map(c=>`<option value="${UI.esc(c)}">`).join("")}</datalist>
        <label><input type="checkbox" ${item.active!==false?"checked":""} onchange="EventMenu.updateItem('${event.id}','${item.id}','active',this.checked)"> Available on this event menu</label>
        <label><input type="checkbox" ${item.includedWithVip?"checked":""} onchange="EventMenu.updateItem('${event.id}','${item.id}','includedWithVip',this.checked)"> Eligible for a ticket-included food/drink benefit</label>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">
          <button type="button" onclick="EventMenu.saveTemplate('${event.id}','${item.id}')">Save to Menu Library</button>
          <button type="button" onclick="EventMenu.removeItem('${event.id}','${item.id}')">Remove from Event</button>
        </div>
      </div>`).join("");
    },

    libraryOptions(category){
      return this.library().filter(x=>!category||x.category===category).map(t=>`<option value="${UI.esc(t.id)}">${UI.esc(t.name)} — ${Utils.money(Number(t.price||0))}</option>`).join("");
    },

    card(event){
      event=this.ensureEvent(event);
      const link=this.publicUrl(event.id);
      return `<div class="card"><h3>Event Food & Beverage Menu</h3>
        <p>Build only the menu you want to offer at this event. The library remembers reusable items, while event prices, quantities, and descriptions remain editable.</p>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;align-items:end;">
          <div><label>Wine Bottles — starts at $20</label><select onchange="if(this.value){EventMenu.addFromTemplate('${event.id}',this.value);this.value=''}"><option value="">Choose a bottle...</option>${this.libraryOptions("Bottles")}</select></div>
          <div><label>Wine by the Glass — starts at $9</label><select onchange="if(this.value){EventMenu.addFromTemplate('${event.id}',this.value);this.value=''}"><option value="">Choose a glass...</option>${this.libraryOptions("Glasses")}</select></div>
          <div><label>Food / Entree Library</label><select onchange="if(this.value){EventMenu.addFromTemplate('${event.id}',this.value);this.value=''}"><option value="">Choose saved food...</option>${this.library().filter(t=>!["Bottles","Glasses"].includes(t.category)).map(t=>`<option value="${UI.esc(t.id)}">${UI.esc(t.category)} — ${UI.esc(t.name)} — ${Utils.money(Number(t.price||0))}</option>`).join("")}</select></div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;">
          <button type="button" onclick="EventMenu.addBlank('${event.id}','Entree')">+ New Entree ($25 start)</button>
          <button type="button" onclick="EventMenu.addBlank('${event.id}','Food')">+ New Food Item</button>
          <button type="button" onclick="EventMenu.addBlank('${event.id}','Snack')">+ New Snack</button>
          <button type="button" onclick="EventMenu.addBlank('${event.id}','Non-Alcoholic')">+ New Beverage</button>
        </div>
        <hr>
        <p><strong>Public menu / preorder page:</strong></p><input readonly value="${UI.esc(link)}" onclick="this.select()"><button type="button" onclick="navigator.clipboard?.writeText('${UI.esc(link)}').then(()=>alert('Menu link copied.')).catch(()=>alert('Select and copy the link above.'))">Copy Menu Link</button>
        ${this.rows(event)}
      </div>`;
    },

    open(eventId){
      const event=this.ensureEvent(Events.get(eventId)); if(!event) return;
      const ws=document.getElementById("workspace"); if(ws) ws.innerHTML=`<h2>Menu — ${UI.esc(event.name||"Event")}</h2>${this.card(event)}${window.LiveEvent?.activeId?`<button onclick="LiveEvent.enter('${UI.esc(eventId)}')">Back to Live Event</button>`:""}`;
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
        const quick=document.createElement("button"); quick.type="button"; quick.textContent="Menu"; quick.onclick=()=>EventMenu.open(event.id); card.appendChild(quick);
        const wrap=document.createElement("div"); wrap.id=`event-menu-${event.id}`; wrap.innerHTML=EventMenu.card(event); card.insertAdjacentElement("afterend",wrap);
      }
    });
    return result;
  };
})();
