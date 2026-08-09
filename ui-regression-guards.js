/* Regression guards for dynamic forms: commit active edits before rerenders and preserve true placeholders. */
(function(){
  function activeEditor(){
    const el=document.activeElement;
    if(!el || !el.closest?.('#workspace')) return null;
    if(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) return el;
    return null;
  }

  // Dynamic SNP Planner screens often rerender after an Add/Remove/Choose action.
  // Force the currently edited field to commit first so onchange handlers cannot
  // lose the last typed value when that rerender replaces the DOM.
  document.addEventListener('pointerdown',function(ev){
    const target=ev.target?.closest?.('button,select');
    if(!target || !target.closest?.('#workspace')) return;
    const el=activeEditor();
    if(el && el!==target){
      try{el.dispatchEvent(new Event('change',{bubbles:true}));}catch(_){ }
      try{el.blur();}catch(_){ }
    }
  },true);

  // Placeholder copy belongs in placeholder attributes, never as stored field
  // values. This also covers textareas, which the earlier input-only guard did not.
  document.addEventListener('focusin',function(ev){
    const el=ev.target;
    if(!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return;
    if(!el.closest?.('#workspace')) return;
    if(el.placeholder && String(el.value||'').trim()===String(el.placeholder||'').trim()) el.value='';
  },true);
})();
