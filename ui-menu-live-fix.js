/* Keep the Live Event Menu button pointed at the event-specific menu planner. */
(function(){
  if(typeof LiveEvent==='undefined') return;
  const prior=LiveEvent.applyFocusedLayout.bind(LiveEvent);
  LiveEvent.applyFocusedLayout=function(){
    prior();
    const eventId=this.activeId;
    const buttons=[...document.querySelectorAll('.topbar-right button')];
    const menuButton=buttons.find(b=>String(b.textContent||'').trim()==='Menu');
    if(menuButton){
      menuButton.onclick=()=>{
        if(typeof EventMenu!=='undefined' && eventId) EventMenu.open(eventId);
        else if(typeof SalesUI!=='undefined') SalesUI.open();
      };
    }
  };
})();
