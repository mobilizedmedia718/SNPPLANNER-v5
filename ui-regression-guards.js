/* Site-wide regression guards for SNP Planner dynamic forms. */
(function(){
  function inPlanner(el){
    return !!el?.closest?.('#app');
  }

  function activeEditor(){
    const el=document.activeElement;
    if(!el || !inPlanner(el)) return null;
    if(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) return el;
    return null;
  }

  function commitActive(target){
    const el=activeEditor();
    if(!el || el===target || el.contains?.(target)) return;
    try{el.dispatchEvent(new Event('change',{bubbles:true}));}catch(_){ }
    try{el.blur();}catch(_){ }
  }

  // Any planner action that can rerender a screen must first commit the field
  // currently being edited. This prevents the final typed value from vanishing
  // when Add, Remove, Save, navigation, or selection controls replace the DOM.
  document.addEventListener('pointerdown',function(ev){
    const target=ev.target?.closest?.('button,a,select,[role="button"]');
    if(!target || !inPlanner(target)) return;
    commitActive(target);
  },true);

  // Keyboard-triggered actions need the same protection as pointer actions.
  document.addEventListener('keydown',function(ev){
    if(ev.key!=='Enter') return;
    const target=ev.target;
    if(!target || !inPlanner(target)) return;
    if(target instanceof HTMLTextAreaElement) return;
    if(target instanceof HTMLInputElement || target instanceof HTMLSelectElement) {
      try{target.dispatchEvent(new Event('change',{bubbles:true}));}catch(_){ }
    }
  },true);

  // Placeholder copy belongs only in placeholder attributes and never as stored
  // field values. Cover inputs and textareas throughout the entire application.
  document.addEventListener('focusin',function(ev){
    const el=ev.target;
    if(!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return;
    if(!inPlanner(el)) return;
    if(el.placeholder && String(el.value||'').trim()===String(el.placeholder||'').trim()) el.value='';
  },true);
})();
