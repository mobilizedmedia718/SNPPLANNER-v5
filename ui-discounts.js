/* Reusable discounts/coupons for Inventory, Vendors, Venues, and Finance. */
(function(){
  const TYPES=['None','Percentage Discount','Flat-Dollar Discount','Coupon / Promo Code','Credit / Rebate','Complimentary / 100% Discount','Other'];
  const key='discount_options';
  function saved(){return Utils.load(key,{names:['Amazon Business Promo'],codes:[]});}
  function remember(name,code){const d=saved(); if(name&&!d.names.includes(name))d.names.push(name); if(code&&!d.codes.includes(code))d.codes.push(code); Utils.save(key,d);}
  function money(n){return Math.max(0,Number(n||0));}
  function calc(r){
    const original=money(r.originalAmount); let discount=0;
    if(r.discountType==='Percentage Discount') discount=original*money(r.discountValue)/100;
    else if(['Flat-Dollar Discount','Coupon / Promo Code','Credit / Rebate','Other'].includes(r.discountType)) discount=money(r.discountValue);
    else if(r.discountType==='Complimentary / 100% Discount') discount=original;
    discount=Math.min(original,discount); const after=Math.max(0,original-discount); const tax=money(r.taxAmount); return {original,discount,after,tax,final:after+tax};
  }
  function block(prefix,r){const d=saved(), c=calc(r); return `<div class="card" style="margin-top:14px"><h4>Discount / Coupon</h4><label>Discount Type</label><select id="${prefix}DiscountType">${TYPES.map(x=>`<option ${r.discountType===x?'selected':''}>${x}</option>`).join('')}</select><label>Discount / Program Name</label><input id="${prefix}DiscountName" list="snpDiscountNames" value="${UI.esc(r.discountName||'')}" placeholder="e.g. Amazon Business Promo"><datalist id="snpDiscountNames">${d.names.map(x=>`<option value="${UI.esc(x)}"></option>`).join('')}</datalist><label>Coupon / Promo Code</label><input id="${prefix}DiscountCode" list="snpDiscountCodes" value="${UI.esc(r.discountCode||'')}"><datalist id="snpDiscountCodes">${d.codes.map(x=>`<option value="${UI.esc(x)}"></option>`).join('')}</datalist><label>Original Amount Before Discount</label><input id="${prefix}OriginalAmount" type="number" min="0" step="0.01" value="${money(r.originalAmount)}"><label>Discount Value (percent or dollars)</label><input id="${prefix}DiscountValue" type="number" min="0" step="0.01" value="${money(r.discountValue)}"><label>Tax</label><input id="${prefix}TaxAmount" type="number" min="0" step="0.01" value="${money(r.taxAmount)}"><label>Discount Notes</label><textarea id="${prefix}DiscountNotes">${UI.esc(r.discountNotes||'')}</textarea><p><small>Saved calculation: Original ${Utils.money(c.original)} − Discount ${Utils.money(c.discount)} = ${Utils.money(c.after)} + Tax ${Utils.money(c.tax)} = <strong>${Utils.money(c.final)}</strong>.</small></p></div>`;}
  function values(prefix){const g=id=>document.getElementById(prefix+id); const v={discountType:g('DiscountType')?.value||'None',discountName:g('DiscountName')?.value.trim()||'',discountCode:g('DiscountCode')?.value.trim()||'',originalAmount:money(g('OriginalAmount')?.value),discountValue:money(g('DiscountValue')?.value),taxAmount:money(g('TaxAmount')?.value),discountNotes:g('DiscountNotes')?.value.trim()||''}; const c=calc(v); Object.assign(v,{discountAmount:c.discount,amountAfterDiscount:c.after,finalAmountPaid:c.final}); remember(v.discountName,v.discountCode); return v;}
  function install(module,editName,saveName,prefix,getter){
    if(typeof UI[editName]!=='function'||typeof UI[saveName]!=='function')return;
    const oe=UI[editName]; UI[editName]=function(id){const out=oe.call(UI,id); setTimeout(()=>{const save=Array.from(document.querySelectorAll('#workspace button')).find(b=>/^Save/.test(b.textContent.trim())); if(!save||document.getElementById(prefix+'DiscountType'))return; const r=getter(id)||{}; save.insertAdjacentHTML('beforebegin',block(prefix,r));},0); return out;};
    const os=UI[saveName]; UI[saveName]=function(id){const r=getter(id); if(r&&document.getElementById(prefix+'DiscountType')) Object.assign(r,values(prefix)); return os.call(UI,id);};
  }
  install(Inventory,'renderInventoryEdit','saveInventory','inventory',id=>Inventory.get(id));
  install(Vendors,'renderVendorEdit','saveVendor','vendor',id=>Vendors.get(id));
  install(Venues,'renderVenueEdit','saveVenue','venue',id=>Venues.get(id));
  install(Finance,'renderFinanceEdit','saveFinance','finance',id=>Finance.get(id));
  window.SNPDiscounts={types:TYPES,calculate:calc,remember};
})();
