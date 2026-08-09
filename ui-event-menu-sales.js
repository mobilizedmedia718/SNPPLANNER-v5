/* Use the event-specific reusable menu in Sales when one is configured. */
(function(){
  if (typeof SalesUI === "undefined") return;

  SalesUI.inventoryForSale = function(){
    const event = Events.get(this.activeEventId());
    const menu = Array.isArray(event?.menuItems)
      ? event.menuItems.filter(i=>i.active!==false && Number(i.price||0)>0)
      : [];

    if (menu.length) return menu.map(i=>({
      id:i.id,
      name:i.name,
      category:i.category||"Event Menu",
      sellPrice:Number(i.price||0),
      quantity:Math.max(0,Number(i.quantity||0)),
      menuItem:true,
      description:i.description||"",
      includedWithVip:!!i.includedWithVip
    }));

    // Legacy fallback: only actual food/beverage/event-sale items.
    // Ticket/admission inventory never belongs on the food & beverage sales menu.
    return Inventory.all().filter(item => {
      if (item.status === "Inactive" || Number(item.sellPrice||0) <= 0) return false;
      if (String(item.category||"").trim().toLowerCase() !== "event sales") return false;
      const text = `${item.name||""} ${item.category||""} ${item.notes||""}`.toLowerCase();
      return !/(ticket|admission|paint admission|vip admission|mix and mingle|art exhibit)/.test(text);
    });
  };

  SalesUI.openMenu = async function(eventId=""){
    const id = eventId || window.LiveEvent?.activeId || this.selectedEventId || "";
    if (id) this.selectedEventId = id;
    this.cart = {};
    await this.refreshCloudState();
    this.renderMenu();
  };

  SalesUI.addItem = function(id){
    const item=this.inventoryForSale().find(x=>String(x.id)===String(id));
    if(!item) return;
    const current=Number(this.cart[id]||0);
    const available=Math.max(0,Number(item.quantity||0));
    if(available>0 && current>=available) return alert(`${item.name} is sold out for this event.`);
    this.cart[id]=current+1;
    this.renderMenu();
  };

  SalesUI.selectedItems = function(){
    return this.inventoryForSale().map(item=>{
      const qty=Number(this.cart[item.id]||0);
      return qty>0?{
        inventoryId:item.menuItem?"":item.id,
        menuItemId:item.menuItem?item.id:"",
        name:item.name,
        quantity:qty,
        price:Number(item.sellPrice||0),
        category:item.category||"",
        saleType:"sale"
      }:null;
    }).filter(Boolean);
  };

  const baseRenderMenu = SalesUI.renderMenu.bind(SalesUI);
  SalesUI.renderMenu = function(){
    const event = Events.get(this.activeEventId());
    const hasEventMenu = Array.isArray(event?.menuItems) && event.menuItems.some(i=>i.active!==false && Number(i.price||0)>0);
    const hasLegacyMenu = this.inventoryForSale().length > 0;
    if (!hasEventMenu && !hasLegacyMenu) {
      const customer = this.selectedCustomerId ? CRM.get(this.selectedCustomerId) : null;
      const workspace=document.getElementById("workspace");
      if(!workspace) return;
      workspace.innerHTML=`<h2>Event Menu</h2><div class="card"><p><strong>Event:</strong> ${UI.esc(event?.name||"Event")}</p><p><strong>Patron:</strong> ${UI.esc(customer ? (CRM.fullName(customer)||customer.email||"Patron") : "Walk-in / No Patron")}</p><button type="button" onclick="SalesUI.renderPatronPicker()">Choose / Change Patron</button></div><div class="card"><h3>Food & Beverage Menu</h3><p>No food or beverage items are active for this event yet.</p><p>Go to the event's <strong>Event Food & Beverage Menu</strong> section and add or activate items. Ticket types are sold separately through <strong>Sell Ticket</strong>.</p></div>`;
      return;
    }
    baseRenderMenu();
    const heading=document.querySelector('#workspace h2');
    if(heading) heading.textContent='Food & Beverage Sales Menu';
    const menuCard=[...document.querySelectorAll('#workspace .card')].find(c=>c.querySelector('h3')?.textContent==='Menu');
    if(menuCard){
      const h=menuCard.querySelector('h3'); if(h) h.textContent='Food & Beverage Menu';
    }
  };

  SalesUI.checkout = async function(){
    const items=this.selectedItems();
    if(!items.length) return alert("Add at least one menu item.");
    const event=Events.get(this.activeEventId());
    for(const sold of items){
      if(sold.menuItemId){
        const item=(event?.menuItems||[]).find(x=>String(x.id)===String(sold.menuItemId));
        if(item && Number(item.quantity||0)>0 && Number(sold.quantity)>Number(item.quantity||0)) return alert(`${sold.name} does not have enough quantity for this sale.`);
      } else {
        const item=Inventory.get(sold.inventoryId);
        if(!item || Number(sold.quantity)>Number(item.quantity||0)) return alert(`${sold.name} does not have enough stock for this sale.`);
      }
    }
    const customer=this.selectedCustomerId?CRM.get(this.selectedCustomerId):null;
    try{
      await SNPStripePayments.startCheckout(items,{eventId:this.activeEventId(),customerId:this.selectedCustomerId,customerEmail:customer?.email||""});
    }catch(error){ alert(error?.message||"Unable to start checkout."); }
  };
})();
