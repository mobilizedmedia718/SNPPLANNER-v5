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
  function blocked(pass){const s=String(pass?.status||'').trim().toLowerCase();return !!pass&&(blockedStatuses.has(s)||!!pass.refundedAt||!!pass.revokedAt||pass.active===false);}

  if(typeof CheckInUI!=='undefined'&&typeof CheckInUI.processSnpTicket==='function'){
    const original=CheckInUI.processSnpTicket.bind(CheckInUI);
    CheckInUI.processSnpTicket=async function(value){
      const rec=parse(value,this.eventId);
      if(rec&&blocked(rec.pass)){await this.stopScanner?.();alert('REFUNDED / INACTIVE TICKET: This QR code has been revoked and cannot be used for admission.');await this.render?.('Refunded or inactive ticket rejected — no attendance record was changed.');return;}
      return original(value);
    };
  }

  if(typeof RedemptionUI!=='undefined'&&typeof RedemptionUI.resolve==='function'){
    const originalResolve=RedemptionUI.resolve.bind(RedemptionUI);
    RedemptionUI.resolve=async function(value){
      const rec=parse(value,this.eventId);
      if(rec&&blocked(rec.pass)) throw new Error(rec.kind==='ticket'?'REFUNDED / INACTIVE TICKET: This QR code has been revoked. Admission and all included benefits are disabled.':'REFUNDED / INACTIVE PURCHASE: This QR code has been revoked. Refunded food, beverage, add-on, or other prepaid items cannot be redeemed.');
      return originalResolve(value);
    };
  }

  window.SNPRefundedQrGuard={parse,isBlocked:blocked};
})();
