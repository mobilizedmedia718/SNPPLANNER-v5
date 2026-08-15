/* Reusable payment terms for venues, vendors, finance records, and future payment-bearing entities. */
(function(){
  if (typeof UI === 'undefined' || typeof Utils === 'undefined') return;

  const PaymentTerms = {
    purposeKey:'payment_purpose_options',
    baseKey:'payment_base_options',
    purposes(){ return [...new Set(['Security', 'Venue Fee', 'Commission', 'Staff Pay', 'Instructor Pay', 'Service Fee', 'Rental', ...(Utils.load(this.purposeKey,[])||[])])]; },
    bases(){ return [...new Set(['Admission Ticket Sales', 'Admission Ticket Sales After Fixed Deduction', 'All Sales', 'Event Sales', 'Beverage / Add-on Sales', 'Other Revenue', ...(Utils.load(this.baseKey,[])||[])])]; },
    remember(key, value){
      value=String(value||'').trim(); if(!value) return;
      const storageKey=key==='purpose'?this.purposeKey:this.baseKey;
      const list=Utils.load(storageKey,[])||[];
      if(!list.some(x=>String(x).toLowerCase()===value.toLowerCase())){ list.push(value); Utils.save(storageKey,list); }
    },
    normalize(record){
      if(!record) return record;
      if(!record.paymentTerms || typeof record.paymentTerms!=='object') record.paymentTerms={};
      const p=record.paymentTerms;
      if(p.paymentType==null) p.paymentType='Flat Rate';
      if(p.percentage==null) p.percentage=0;
      if(p.fixedDeduction==null) p.fixedDeduction=0;
      if(p.purpose==null) p.purpose='';
      if(p.percentageBase==null) p.percentageBase='All Sales';
      if(p.notes==null) p.notes='';
      return record;
    },
    options(values, selected){ return values.map(v=>`<option value="${UI.esc(v)}" ${String(v)===String(selected)?'selected':''}>${UI.esc(v)}</option>`).join(''); },
    datalist(values){ return values.map(v=>`<option value="${UI.esc(v)}"></option>`).join(''); },
    calc(terms, revenue){
      terms=terms||{};
      const base=Math.max(0,Number(revenue||0)-Math.max(0,Number(terms.fixedDeduction||0)));
      if(String(terms.paymentType)==='Percentage') return base*Math.max(0,Number(terms.percentage||0))/100;
      return Number(terms.flatRate||0);
    },
    card(kind,id,record){
      this.normalize(record); const p=record.paymentTerms;
      const purposeId=`pt-purpose-${kind}-${id}`, baseId=`pt-base-${kind}-${id}`;
      return `<div class="card" data-payment-terms-card="${UI.esc(kind)}:${UI.esc(id)}">
        <h3>Payment Terms</h3>
        <p><small>Use this for flat-rate or percentage arrangements. Typed purposes and revenue bases are remembered for future records.</small></p>
        <label>Payment Type</label>
        <select onchange="PaymentTerms.update('${kind}','${UI.esc(id)}','paymentType',this.value)">
          ${this.options(['Flat Rate','Hourly','Percentage','No Payment'],p.paymentType)}
        </select>
        <label>What is this payment for?</label>
        <input list="${purposeId}" value="${UI.esc(p.purpose||'')}" placeholder="Security, commission, rental..." onchange="PaymentTerms.update('${kind}','${UI.esc(id)}','purpose',this.value)">
        <datalist id="${purposeId}">${this.datalist(this.purposes())}</datalist>
        <label>Percentage (%)</label>
        <input type="number" min="0" step="0.01" value="${Number(p.percentage||0)}" onchange="PaymentTerms.update('${kind}','${UI.esc(id)}','percentage',Number(this.value||0))">
        <label>Percentage Applies To</label>
        <input list="${baseId}" value="${UI.esc(p.percentageBase||'')}" placeholder="Admission Ticket Sales..." onchange="PaymentTerms.update('${kind}','${UI.esc(id)}','percentageBase',this.value)">
        <datalist id="${baseId}">${this.datalist(this.bases())}</datalist>
        <label>Fixed Deduction Before Percentage</label>
        <input type="number" min="0" step="0.01" value="${Number(p.fixedDeduction||0)}" onchange="PaymentTerms.update('${kind}','${UI.esc(id)}','fixedDeduction',Number(this.value||0))">
        <label>Payment Notes / Rule Description</label>
        <textarea placeholder="Describe exactly how this payment is calculated" onchange="PaymentTerms.update('${kind}','${UI.esc(id)}','notes',this.value)">${UI.esc(p.notes||'')}</textarea>
      </div>`;
    },
    summary(record){
      this.normalize(record); const p=record.paymentTerms;
      return `<div class="card"><h3>Payment Terms</h3>
        <p><strong>Payment Type:</strong> ${UI.esc(p.paymentType||'—')}</p>
        <p><strong>Purpose:</strong> ${UI.esc(p.purpose||'—')}</p>
        <p><strong>Percentage:</strong> ${Number(p.percentage||0)}%</p>
        <p><strong>Applies To:</strong> ${UI.esc(p.percentageBase||'—')}</p>
        <p><strong>Fixed Deduction Before Percentage:</strong> ${Utils.money(p.fixedDeduction||0)}</p>
        <p><strong>Rule:</strong> ${UI.esc(p.notes||'—')}</p></div>`;
    },
    entity(kind,id){
      if(kind==='venue' && typeof Venues!=='undefined') return {record:Venues.get(id),save:u=>Venues.update(id,u)};
      if(kind==='vendor' && typeof Vendors!=='undefined') return {record:Vendors.get(id),save:u=>Vendors.update(id,u)};
      if(kind==='finance' && typeof Finance!=='undefined') return {record:Finance.get(id),save:u=>Finance.update(id,u)};
      return null;
    },
    update(kind,id,key,value){
      const e=this.entity(kind,id); if(!e?.record) return;
      this.normalize(e.record); e.record.paymentTerms[key]=value;
      if(key==='purpose') this.remember('purpose',value);
      if(key==='percentageBase') this.remember('base',value);
      e.save({paymentTerms:e.record.paymentTerms});
    }
  };
  window.PaymentTerms=PaymentTerms;

  function wrap(name,kind,module){
    const original=UI[name]; if(typeof original!=='function') return;
    UI[name]=function(id){
      const result=original.call(UI,id);
      const record=module.get(id); const workspace=document.getElementById('workspace');
      if(record && workspace && !workspace.querySelector(`[data-payment-terms-card^="${kind}:"]`)) workspace.insertAdjacentHTML('beforeend',PaymentTerms.card(kind,id,record));
      return result;
    };
  }
  function wrapDetail(name,module){
    const original=UI[name]; if(typeof original!=='function') return;
    UI[name]=function(id){
      const result=original.call(UI,id); const record=module.get(id); const workspace=document.getElementById('workspace');
      if(record && workspace && !workspace.querySelector('[data-payment-terms-summary]')){
        const box=document.createElement('div'); box.dataset.paymentTermsSummary='1'; box.innerHTML=PaymentTerms.summary(record); workspace.appendChild(box);
      }
      return result;
    };
  }
  if(typeof Venues!=='undefined'){ wrap('renderVenueEdit','venue',Venues); wrapDetail('renderVenueDetail',Venues); }
  if(typeof Vendors!=='undefined'){ wrap('renderVendorEdit','vendor',Vendors); wrapDetail('renderVendorDetail',Vendors); }
  if(typeof Finance!=='undefined'){ wrap('renderFinanceEdit','finance',Finance); wrapDetail('renderFinanceDetail',Finance); }
})();
