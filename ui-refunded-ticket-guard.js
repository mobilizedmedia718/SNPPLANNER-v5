/* Refunded/cancelled QR guard for admission and all QR-based redemptions. */
(function(){
  const blockedStatuses=new Set(['refunded','partially refunded','partially_refunded','cancelled','canceled','void','voided','inactive','revoked']);
  function parse(value,eventId){
    const raw=String(value||'').trim(),parts=raw.split(':');
    if(String(parts[1]||'')!==String(eventId||'')) return null;
    const event=Events.get(eventId); if(!event)return null;
    if(raw.startsWith('SNP-TICKET:')) return {kind:'ticket',pass:(event.ticketPasses||[]).find(p=>String(p.id)===String(parts[2]||''))||null};
    if(raw.startsWith('SNP-PREPAID:')) return {kind:'prepaid',pass:(event.prepaidPasses||[]).find(p=>String(p.id)===String(parts[2]||''))||null};
    return null;
  }
  function locallyBlocked(pass){const s=String(pass?.status||'').trim().toLowerCase();return !!pass&&(blockedStatuses.has(s)||!!pass.refundedAt||!!pass.revokedAt||pass.active===false);}
  async function stripeOrderBlocked(pass){
    if(!pass?.stripeOrderId||typeof SNP_SUPABASE_URL==='undefined'||typeof SNPDatabase==='undefined')return false;
    try{
      const session=await SNPDatabase.getSession();
      const token=session?.access_token||'';
      if(!token)return false;
      const r=await fetch(`${SNP_SUPABASE_URL}/rest/v1/stripe_orders?id=eq.${encodeURIComponent(pass.stripeOrderId)}&select=status,refunded_amount`,{headers:{...SNPDatabase.headers(token),Authorization:`Bearer ${token}`},cache:'no-store'});
      if(!r.ok)return false;
      const rows=await r.json(),row=Array.isArray(rows)?rows[0]:null;
      const status=String(row?.status||'').trim().toLowerCase();
      return blockedStatuses.has(status)||Number(row?.refunded_amount||0)>0;
    }catch(_){return false;}
  }
  async function blocked(pass){return locallyBlocked(pass)||await stripeOrderBlocked(pass);}

  if(typeof CheckInUI!=='undefined'&&typeof CheckInUI.processSnpTicket==='function'){
    const original=CheckInUI.processSnpTicket.bind(CheckInUI);
    CheckInUI.processSnpTicket=async function(value){
      const rec=parse(value,this.eventId);
      if(rec&&await blocked(rec.pass)){await this.stopScanner?.();alert('REFUNDED / INACTIVE TICKET: This QR code has been revoked and cannot be used for admission.');await this.render?.('Refunded or inactive ticket rejected — no attendance record was changed.');return;}
      return original(value);
    };
  }

  if(typeof RedemptionUI!=='undefined'&&typeof RedemptionUI.resolve==='function'){
    const originalResolve=RedemptionUI.resolve.bind(RedemptionUI);
    RedemptionUI.resolve=async function(value){
      const rec=parse(value,this.eventId);
      if(rec&&await blocked(rec.pass)) throw new Error(rec.kind==='ticket'?'REFUNDED / INACTIVE TICKET: This QR code has been revoked. Admission and all included benefits are disabled.':'REFUNDED / INACTIVE PURCHASE: This QR code has been revoked. Refunded food, beverage, add-on, or other prepaid items cannot be redeemed.');
      return originalResolve(value);
    };
  }

  window.SNPRefundedQrGuard={parse,isBlocked:blocked};
})();
