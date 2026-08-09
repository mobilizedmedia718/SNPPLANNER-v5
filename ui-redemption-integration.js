/* Redemption/preorder integration hooks. */
(function(){
  if(typeof TicketPlanning!=='undefined'){
    TicketPlanning.addTemplateFromTicket=function(eventId,ticketId){
      const event=Events.get(eventId);if(!event)return;const t=(event.ticketTypes||[]).find(x=>x.id===ticketId);if(!t)return;
      const templates=this.templates();const same=templates.find(x=>String(x.name||'').trim().toLowerCase()===String(t.name||'').trim().toLowerCase());
      const payload={id:same?.id||Utils.id(),name:t.name||'',description:t.description||'',price:Number(t.price||0),kind:t.kind||'paint',includesPainting:t.includesPainting!==false,canvasSize:t.canvasSize||'',accessLevel:t.accessLevel||'',inclusions:JSON.parse(JSON.stringify(Array.isArray(t.inclusions)?t.inclusions:[]))};
      if(same)Object.assign(same,payload);else templates.push(payload);this.saveTemplates(templates);alert('Ticket type and included benefits saved as a reusable template.');UI.renderEvents();
    };
  }
  if(typeof TicketInclusions!=='undefined'){
    const originalAdd=TicketInclusions.add.bind(TicketInclusions);
    TicketInclusions.add=function(eventId,ticketId){originalAdd(eventId,ticketId);const e=Events.get(eventId);const t=(e?.ticketTypes||[]).find(x=>x.id===ticketId);const last=t?.inclusions?.[t.inclusions.length-1];if(last){last.redeemable=true;Events.update(eventId,{ticketTypes:e.ticketTypes});}};
  }
  if(typeof EventMenu!=='undefined'){
    const oldCard=EventMenu.card.bind(EventMenu);
    EventMenu.card=function(event){const base=oldCard(event);const link=`https://mobilizedmedia718.github.io/SNPPLANNER-v5/preorder.html?event_id=${encodeURIComponent(event.id)}`;return base.replace('</div>',`<hr><h4>Customer Preorder Link</h4><p>Customers can order and pay for event menu items before arrival. Their paid order receives a one-time redemption QR.</p><input readonly value="${UI.esc(link)}" onclick="this.select()"><button type="button" onclick="navigator.clipboard?.writeText('${UI.esc(link)}').then(()=>alert('Preorder link copied.')).catch(()=>alert('Select and copy the link above.'))">Copy Preorder Link</button><button type="button" onclick="window.open('${UI.esc(link)}','_blank')">Open Customer Menu</button></div>`);};
  }
  if(typeof LiveEvent!=='undefined'){
    const oldApply=LiveEvent.applyFocusedLayout.bind(LiveEvent);
    LiveEvent.applyFocusedLayout=function(){oldApply();const r=document.querySelector('.topbar-right');if(r&&typeof RedemptionUI!=='undefined'&&!document.getElementById('liveRedeemButton')){const b=document.createElement('button');b.id='liveRedeemButton';b.type='button';b.textContent='Redeem';b.onclick=()=>RedemptionUI.open(LiveEvent.activeId);const scan=[...r.querySelectorAll('button')].find(x=>x.textContent.includes('Scan'));if(scan)scan.insertAdjacentElement('afterend',b);else r.appendChild(b);}};
  }
})();