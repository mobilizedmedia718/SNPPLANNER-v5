/* Refunded/cancelled ticket QR guard for admission and benefit redemption. */
(function(){
  const blockedStatuses = new Set(['refunded','partially refunded','partially_refunded','cancelled','canceled','void','voided','inactive']);
  function ticketFromQr(value, eventId){
    const raw=String(value||'').trim();
    if(!raw.startsWith('SNP-TICKET:')) return null;
    const parts=raw.split(':');
    if(String(parts[1]||'')!==String(eventId||'')) return null;
    const event=Events.get(eventId);
    return (event?.ticketPasses||[]).find(p=>String(p.id)===String(parts[2]||''))||null;
  }
  function isBlocked(pass){
    const status=String(pass?.status||'').trim().toLowerCase();
    return !!pass && (blockedStatuses.has(status) || !!pass.refundedAt || pass.active===false);
  }

  if(typeof CheckInUI!=='undefined' && typeof CheckInUI.processSnpTicket==='function'){
    const original=CheckInUI.processSnpTicket.bind(CheckInUI);
    CheckInUI.processSnpTicket=async function(value){
      const pass=ticketFromQr(value,this.eventId);
      if(isBlocked(pass)){
        await this.stopScanner?.();
        alert('REFUNDED / INACTIVE TICKET: This QR code is no longer valid and cannot be used for admission.');
        await this.render?.('Refunded or inactive ticket rejected — no attendance record was changed.');
        return;
      }
      return original(value);
    };
  }

  if(typeof RedemptionUI!=='undefined' && typeof RedemptionUI.resolve==='function'){
    const originalResolve=RedemptionUI.resolve.bind(RedemptionUI);
    RedemptionUI.resolve=async function(value){
      const pass=ticketFromQr(value,this.eventId);
      if(isBlocked(pass)) throw new Error('REFUNDED / INACTIVE TICKET: This QR code is no longer valid and no included benefits can be redeemed.');
      return originalResolve(value);
    };
  }
})();
