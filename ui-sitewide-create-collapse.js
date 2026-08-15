/* Site-wide create-form behavior: create/add fields are closed by default, open only on request, close after save. */
(function(){
  const CREATE_HEAD=/^(add|create|new)\b/i;
  const SAVE_TEXT=/^(save|create|add|submit)\b/i;
  const SKIP_TEXT=/invite|link|refresh|selected|event|staff|employee to event|backup/i;

  function ensureCss(){if(document.getElementById('snp-collapse-css'))return;const s=document.createElement('style');s.id='snp-collapse-css';s.textContent='.snp-create-form-body.snp-force-closed{display:none!important}.snp-create-toggle{display:inline-block!important}';document.head.appendChild(s);}
  function isCreateCard(card){
    if(!card||card.dataset.snpCollapsible==='1'||card.closest('[data-event-staff-panel]'))return false;
    const head=card.querySelector(':scope > h2,:scope > h3,:scope > h4');if(!head)return false;
    const title=(head.textContent||'').trim();if(!CREATE_HEAD.test(title))return false;
    return !!card.querySelector('input:not([type="hidden"]),textarea,select');
  }
  function close(body,toggle,title){body.hidden=true;body.classList.add('snp-force-closed');toggle.setAttribute('aria-expanded','false');toggle.textContent=title;}
  function open(body,toggle,title){body.hidden=false;body.classList.remove('snp-force-closed');toggle.setAttribute('aria-expanded','true');toggle.textContent=`Hide ${title}`;const f=body.querySelector('input:not([type="hidden"]),textarea,select');setTimeout(()=>f?.focus(),0);}
  function enhance(card){
    if(!isCreateCard(card))return;
    const head=card.querySelector(':scope > h2,:scope > h3,:scope > h4'),title=(head.textContent||'Create').trim();
    const body=document.createElement('div');body.className='snp-create-form-body snp-force-closed';body.hidden=true;
    [...card.childNodes].filter(n=>n!==head).forEach(n=>body.appendChild(n));
    const toggle=document.createElement('button');toggle.type='button';toggle.className='snp-create-toggle';toggle.textContent=title;toggle.setAttribute('aria-expanded','false');toggle.style.margin='0 0 10px 0';
    toggle.onclick=()=>body.classList.contains('snp-force-closed')?open(body,toggle,title):close(body,toggle,title);
    head.style.display='none';card.appendChild(toggle);card.appendChild(body);card.dataset.snpCollapsible='1';close(body,toggle,title);
  }
  function scan(){ensureCss();const w=document.getElementById('workspace');if(!w)return;w.querySelectorAll('.card').forEach(enhance);}

  document.addEventListener('click',e=>{
    const btn=e.target.closest('button');if(!btn)return;
    const text=(btn.textContent||'').trim();if(!SAVE_TEXT.test(text)||SKIP_TEXT.test(text))return;
    const body=btn.closest('.snp-create-form-body');if(!body)return;
    const card=body.closest('.card'),toggle=card?.querySelector(':scope > .snp-create-toggle');if(!toggle)return;
    const title=(toggle.textContent||'Create').replace(/^Hide\s+/,'');
    setTimeout(()=>{if(document.body.contains(body))close(body,toggle,title);},250);
  },true);

  /* When a list/menu is freshly rendered, force every create/add card closed again. */
  let busy=false;const schedule=()=>{if(busy)return;busy=true;setTimeout(()=>{busy=false;scan();document.querySelectorAll('.snp-create-form-body').forEach(body=>{const card=body.closest('.card'),toggle=card?.querySelector(':scope > .snp-create-toggle');if(toggle&&toggle.getAttribute('aria-expanded')!=='true')body.classList.add('snp-force-closed');});},0)};
  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(schedule,0);
})();