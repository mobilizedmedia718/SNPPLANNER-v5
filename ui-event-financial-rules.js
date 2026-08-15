/* Event revenue buckets + contractual venue payment calculations. */
(function(){
  if (typeof Finance === 'undefined' || typeof Events === 'undefined' || typeof Venues === 'undefined' || typeof UI === 'undefined' || typeof Utils === 'undefined') return;

  const originalEventProfit = Finance.eventProfit.bind(Finance);

  function activeIncome(eventId){
    return Finance.byEvent(eventId).filter(t => t.type === 'Income' && t.status !== 'Cancelled');
  }
  function text(v){ return String(v || '').trim().toLowerCase(); }
  function bucketOf(t){
    const explicit = text(t.revenueType || t.revenue_type);
    if (['admission_ticket','ticket','tickets'].includes(explicit)) return 'admission';
    if (['beverage_addon','beverage','add_on','addon','prepaid_addon','preorder'].includes(explicit)) return 'beverageAddon';
    const c = text(t.category);
    const d = text(t.description);
    if (c.includes('ticket') && !c.includes('drink') && !c.includes('beverage') && !c.includes('food')) return 'admission';
    if (c.includes('prepaid event menu') || c.includes('beverage') || c.includes('drink') || c.includes('add-on') || c.includes('addon') || c.includes('food') || c.includes('menu')) return 'beverageAddon';
    if (d.includes('drink ticket') || d.includes('beverage ticket')) return 'beverageAddon';
    return 'other';
  }

  Finance.eventRevenueBuckets = function(eventId){
    const event = Events.get(eventId) || {};
    const rows = activeIncome(eventId);
    let stripeAdmission = 0, beverageAddon = 0, other = 0;
    rows.forEach(t => {
      const amount = Number(t.amount || 0);
      const b = bucketOf(t);
      if (b === 'admission') stripeAdmission += amount;
      else if (b === 'beverageAddon') beverageAddon += amount;
      else other += amount;
    });
    const eventbriteAdmission = Math.max(0, Number(event.eventbriteRevenue || 0));
    const admission = stripeAdmission + eventbriteAdmission;
    const financeIncome = rows.reduce((s,t)=>s + Number(t.amount || 0),0);
    const knownGross = financeIncome + eventbriteAdmission;
    const eventGross = Math.max(knownGross, Number(event.actualRevenue || 0));
    const unclassified = Math.max(0, eventGross - knownGross);
    return { admission, stripeAdmission, eventbriteAdmission, beverageAddon, other, unclassified, gross:eventGross };
  };

  Finance.paymentBaseRevenue = function(eventId, terms){
    const b = Finance.eventRevenueBuckets(eventId);
    const baseName = text(terms?.percentageBase);
    if (baseName.includes('admission ticket')) return b.admission;
    if (baseName.includes('beverage') || baseName.includes('add-on') || baseName.includes('addon')) return b.beverageAddon;
    if (baseName.includes('other')) return b.other + b.unclassified;
    if (baseName.includes('event sales')) return b.beverageAddon + b.other + b.unclassified;
    return b.gross;
  };

  Finance.eventContractualPayments = function(eventId){
    const event = Events.get(eventId);
    if (!event) return [];
    const venue = Venues.get(event.venueId);
    const rows = [];
    if (venue?.paymentTerms && String(venue.paymentTerms.paymentType || '') !== 'No Payment') {
      const p = venue.paymentTerms;
      const rawBase = Finance.paymentBaseRevenue(eventId, p);
      const fixedDeduction = Math.max(0, Number(p.fixedDeduction || 0));
      const percentageBase = Math.max(0, rawBase - fixedDeduction);
      let amount = 0;
      if (String(p.paymentType) === 'Percentage') amount = percentageBase * Math.max(0, Number(p.percentage || 0)) / 100;
      else if (String(p.paymentType) === 'Hourly') amount = Number(p.hourlyRate || 0) * Number(p.hours || 0);
      else amount = Number(p.flatRate || 0);
      rows.push({ entityType:'venue', entityId:venue.id, entityName:venue.name || 'Venue', purpose:p.purpose || '', terms:p, rawBase, fixedDeduction, percentageBase, amount });
    }
    return rows;
  };

  Finance.eventContractualExpense = function(eventId){
    return Finance.eventContractualPayments(eventId).reduce((s,x)=>s + Number(x.amount || 0),0);
  };

  Finance.eventProfit = function(eventId){
    return originalEventProfit(eventId) - Finance.eventContractualExpense(eventId);
  };

  const originalDetail = UI.renderEventDetail;
  if (typeof originalDetail === 'function') {
    UI.renderEventDetail = function(id){
      const result = originalDetail.call(UI,id);
      const event = Events.get(id), workspace = document.getElementById('workspace');
      if (!event || !workspace || workspace.querySelector('[data-event-financial-rules]')) return result;
      const b = Finance.eventRevenueBuckets(id);
      const obligations = Finance.eventContractualPayments(id);
      const ordinaryExpenses = Finance.byEvent(id).filter(t=>t.type==='Expense' && t.status!=='Cancelled').reduce((s,t)=>s+Number(t.amount||0),0);
      const contractual = obligations.reduce((s,x)=>s+Number(x.amount||0),0);
      const adjustedProfit = b.gross - ordinaryExpenses - contractual;
      const box = document.createElement('div');
      box.className = 'card';
      box.dataset.eventFinancialRules = '1';
      box.innerHTML = `<h3>Revenue & Percentage Payment Breakdown</h3>
        <p><strong>Gross Event Revenue:</strong> ${Utils.money(b.gross)}</p>
        <p><strong>Admission Ticket Revenue:</strong> ${Utils.money(b.admission)} <small>(Stripe ${Utils.money(b.stripeAdmission)} + Eventbrite ${Utils.money(b.eventbriteAdmission)})</small></p>
        <p><strong>Beverage / Add-on Revenue:</strong> ${Utils.money(b.beverageAddon)}</p>
        <p><strong>Other Revenue:</strong> ${Utils.money(b.other)}</p>
        ${b.unclassified ? `<p><strong>Unclassified / Manual Revenue:</strong> ${Utils.money(b.unclassified)}</p>` : ''}
        ${obligations.length ? obligations.map(x=>`<hr><p><strong>${UI.esc(x.entityName)} — ${UI.esc(x.purpose || 'Payment')}:</strong></p>
          <p>Revenue base: ${Utils.money(x.rawBase)}</p>
          <p>Fixed deduction before percentage: ${Utils.money(x.fixedDeduction)}</p>
          <p>Amount subject to percentage: ${Utils.money(x.percentageBase)}</p>
          <p>${Number(x.terms.percentage||0)}% payment: <strong>${Utils.money(x.amount)}</strong></p>
          <p><small>${UI.esc(x.terms.notes || '')}</small></p>`).join('') : '<p>No percentage-based venue obligation is configured for this event.</p>'}
        <hr><p><strong>Other Recorded Expenses:</strong> ${Utils.money(ordinaryExpenses)}</p>
        <p><strong>Contractual Percentage Payments:</strong> ${Utils.money(contractual)}</p>
        <p style="font-size:1.2em"><strong>Adjusted Event Profit:</strong> ${Utils.money(adjustedProfit)}</p>`;
      workspace.appendChild(box);
      return result;
    };
  }

  window.SNPEventFinancialRules = { bucketOf };
})();
