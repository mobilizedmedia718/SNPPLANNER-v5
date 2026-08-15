/* Reliable inventory Save Item handler. Persists the completed record before leaving edit mode. */
(function(){
  if(typeof Inventory==='undefined' || typeof UI==='undefined' || typeof Utils==='undefined') return;

  function value(id){ return document.getElementById(id)?.value ?? ''; }
  function number(id){ return Number(value(id) || 0); }

  async function saveInventoryFromEditor(button){
    const root=button.closest('#workspace');
    if(!root) return;
    const idMatch=String(button.getAttribute('onclick')||'').match(/Inventory\.update\('([^']+)'/);
    const id=idMatch?.[1];
    if(!id || !Inventory.get(id)) return;

    Inventory.update(id,{
      name:value('inventoryName').trim(),
      category:value('inventoryCategory').trim(),
      sku:value('inventorySku').trim(),
      vendorId:value('inventoryVendorId'),
      purchaseUnit:value('inventoryPurchaseUnit'),
      purchaseQuantity:number('inventoryPurchaseQuantity'),
      unitsPerPurchase:Math.max(1,number('inventoryUnitsPerPurchase')||1),
      purchaseCostType:value('inventoryPurchaseCostType'),
      purchaseCost:number('inventoryPurchaseCost'),
      purchaseDate:value('inventoryPurchaseDate'),
      invoiceNumber:value('inventoryInvoiceNumber').trim(),
      purchaseNotes:value('inventoryPurchaseNotes'),
      quantity:number('inventoryQuantity'),
      minimum:number('inventoryMinimum'),
      sellPrice:number('inventorySellPrice'),
      storageLocation:value('inventoryStorageLocation').trim(),
      status:value('inventoryStatus') || 'Active',
      notes:value('inventoryNotes')
    });

    button.disabled=true;
    const oldText=button.textContent;
    button.textContent='Saving...';
    const synced=await Utils.flushSave('inventory');
    button.disabled=false;
    button.textContent=oldText;
    if(!synced){
      alert('The item was saved on this device, but cloud sync did not finish. Check your connection and try Save again before leaving this page.');
      return;
    }
    UI.renderInventoryDetail(id);
  }

  document.addEventListener('click',function(ev){
    const button=ev.target?.closest?.('button');
    if(!button || String(button.textContent||'').trim()!=='Save Item') return;
    if(!button.closest('#workspace')) return;
    ev.preventDefault();
    ev.stopPropagation();
    ev.stopImmediatePropagation();
    saveInventoryFromEditor(button).catch(error=>{
      console.error('Inventory save failed:',error);
      alert('Inventory could not be saved. Your entries are still on this screen; please try again.');
    });
  },true);
})();
