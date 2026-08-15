/* Site-wide create/edit form behavior: fields stay hidden until opened and collapse after save. */
(function(){
  const FORM_HEAD=/^(add|create|new)\b/i;
  const SAVE_TEXT=/^(save|create|add)\b/i;
  function candidate(card){
    if(!card||card.dataset.snpCollapsible==='1')return false;
    if(card.closest('[data-event-staff-quick]'))return false;
    const head=card.querySelector(':scope > h3, :scope > h4');if(!head)return false;
    const title=(head.textContent||'').trim();if(!FORM_HEAD.test(title))return false;
    if(!card.querySelector('input,textarea,select'))return false;
    return true;
  }
  function enhance(card){
    if(!candidate(card))return;
    const head=card.querySelector(':scope > h3, :scope > h4');
    const title=(head.textContent||'Create').trim();
    const body=document.createElement('div');body.className='snp-create-form-body';body.hidden=true;
    const nodes=[...card.childNodes].filter(n=>n!==head);
    nodes.forEach(n=>body.appendChild(n));
    const toggle=document.createElement('button');toggle.type='button';toggle.className='snp-create-toggle';toggle.textContent=title;toggle.style.margin='0 0 10px 0';
    toggle.onclick=()=>{body.hidden=!body.hidden;toggle.textContent=body.hidden?title:`Hide ${title}`;if(!body.hidden){const first=body.querySelector('input:not([type="hidden"]),textarea,select');setTimeout(()=>first?.focus(),0);}};
    head.style.display='none';card.appendChild(toggle);card.appendChild(body);card.dataset.snpCollapsible='1';
    body.addEventListener('click',e=>{const btn=e.target.closest('button');if(!btn)return;const txt=(btn.textContent||'').trim();if(!SAVE_TEXT.test(txt))return;if(/invite|link|refresh|selected|event/i.test(txt))return;setTimeout(()=>{if(document.body.contains(body)){body.hidden=true;toggle.textContent=title;}},350);});
  }
  function scan(){const w=document.getElementById('workspace');if(!w)return;w.querySelectorAll('.card').forEach(enhance);}
  let busy=false;const schedule=()=>{if(busy)return;busy=true;setTimeout(()=>{busy=false;scan();},0)};
  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(scan,0);
})();