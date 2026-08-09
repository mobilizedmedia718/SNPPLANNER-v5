/* Use the event-specific reusable menu in Sales when one is configured. */
(function(){
  if (typeof SalesUI === "undefined") return;

  SalesUI.inventoryForSale = function(){
    const event = Events.get(this.activeEventId());
    const menu = Array.isArray(event?.menuItems) ? event.menuItems.filter(i=>i.active!==false && Number(i.price||0)>0) : [];
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
    return Inventory.all().filter(item => item.status !== "Inactive" && Number(item.sellPrice||0)>0 && String(item.category||"").trim().toLowerCase()==="event sales");
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

  SalesUI.checkout = async function(){
    const items=this.selectedItems();
    if(!items.length) return alert("Add at least one item.");
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
